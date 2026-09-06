import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidSolanaAddress } from "@/lib/solana";
import { findAccount, getOrder, placeMarketBuy, sendCrypto } from "@/lib/coinbase";

// Personal-use buy flow: places a real market order on the operator's own
// Coinbase account (funded by whatever card/bank is linked there) and
// sends the filled SOL straight to the requesting wallet. This is not a
// customer-facing money-transmission product — it's automating one
// person's own verified Coinbase account, the same way a personal trading
// bot would.
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  const { walletAddress, sourceAmount } = await req.json();

  if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const amount = Number(sourceAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid source amount" }, { status: 400 });
  }

  if (!process.env.COINBASE_API_KEY_NAME || !process.env.COINBASE_API_PRIVATE_KEY) {
    return NextResponse.json(
      {
        error:
          "Coinbase is not configured on this deployment. Set COINBASE_API_KEY_NAME and COINBASE_API_PRIVATE_KEY in your environment variables.",
      },
      { status: 503 }
    );
  }

  try {
    let order = await placeMarketBuy(amount.toFixed(2));

    // IOC market orders resolve almost immediately, but give it a few
    // extra checks in case Coinbase hasn't settled the fill yet.
    for (let attempt = 0; attempt < 5 && order.status !== "FILLED"; attempt++) {
      await sleep(1000);
      order = await getOrder(order.order_id);
    }

    if (order.status !== "FILLED" || !order.filled_size) {
      return NextResponse.json(
        {
          error: `Order did not fill in time (status: ${order.status ?? "unknown"}). Check your Coinbase account directly — it may still complete.`,
          orderId: order.order_id,
        },
        { status: 502 }
      );
    }

    const solAccount = await findAccount("SOL");
    const send = await sendCrypto({
      accountId: solAccount.uuid,
      toAddress: walletAddress,
      amount: order.filled_size,
      currency: "SOL",
    });

    prisma.transaction
      .create({
        data: {
          walletAddress,
          type: "BUY",
          status: send.status === "completed" ? "COMPLETED" : "PROCESSING",
          provider: "coinbase",
          providerSessionId: order.order_id,
          sourceAmount: amount,
          sourceCurrency: "usd",
          destinationAmount: order.filled_size,
          destinationCurrency: "sol",
        },
      })
      .catch((err) => console.error("Failed to log buy transaction (non-blocking)", err));

    return NextResponse.json({
      status: "sent",
      solAmount: order.filled_size,
      averagePrice: order.average_filled_price,
      sendId: send.id,
      sendStatus: send.status,
    });
  } catch (err) {
    console.error("Coinbase buy flow failed", err);
    const message = err instanceof Error ? err.message : "Failed to complete the purchase";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
