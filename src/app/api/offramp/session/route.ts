import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidSolanaAddress } from "@/lib/solana";

// Stripe Crypto Onramp is buy-only — there is no Stripe API to convert
// crypto back to fiat. Sell orders go through a separate off-ramp provider
// (Kado by default; swap the fetch target below for Coinbase Offramp or
// MoonPay if preferred). The provider handles KYC, the SOL -> fiat quote,
// and payout to the user's linked bank account/card.
const OFFRAMP_API_URL = process.env.OFFRAMP_PROVIDER_API_URL ?? "https://api.kado.money";

export async function POST(req: NextRequest) {
  const { walletAddress, sourceAmount, sourceCurrency = "sol" } = await req.json();

  if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const amount = Number(sourceAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid source amount" }, { status: 400 });
  }

  const apiKey = process.env.OFFRAMP_PROVIDER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "The off-ramp provider is not configured on this deployment. Set OFFRAMP_PROVIDER_API_KEY (and OFFRAMP_PROVIDER_API_URL if not using Kado) to enable selling.",
      },
      { status: 503 }
    );
  }

  try {
    const providerRes = await fetch(`${OFFRAMP_API_URL}/v2/sell/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        walletAddress,
        sourceAmount: amount,
        sourceCurrency,
        network: "solana",
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/webhooks/offramp`,
      }),
    });

    if (!providerRes.ok) {
      const body = await providerRes.text();
      console.error("Off-ramp provider error", providerRes.status, body);
      return NextResponse.json({ error: "Off-ramp provider rejected the request" }, { status: 502 });
    }

    const providerSession = (await providerRes.json()) as {
      sessionId: string;
      widgetUrl: string;
      depositAddress: string;
    };

    // Best-effort activity log — see the onramp session route for why this
    // never blocks the actual sell flow.
    prisma.transaction
      .create({
        data: {
          walletAddress,
          type: "SELL",
          status: "PENDING",
          provider: "kado",
          providerSessionId: providerSession.sessionId,
          sourceAmount: amount,
          sourceCurrency,
          destinationCurrency: "usd",
        },
      })
      .catch((err) => console.error("Failed to log sell transaction (non-blocking)", err));

    return NextResponse.json({
      widgetUrl: providerSession.widgetUrl,
      depositAddress: providerSession.depositAddress,
      sessionId: providerSession.sessionId,
    });
  } catch (err) {
    console.error("Failed to create off-ramp session", err);
    return NextResponse.json({ error: "Failed to create off-ramp session" }, { status: 502 });
  }
}
