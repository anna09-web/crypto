import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidSolanaAddress } from "@/lib/solana";

// Stripe's Crypto Onramp API (`crypto/onramp_sessions`) is in public beta and
// not yet part of the typed stripe-node SDK, so it's called directly over
// Stripe's REST API with the secret key as a bearer token.
const STRIPE_API_BASE = "https://api.stripe.com/v1";

export async function POST(req: NextRequest) {
  const { walletAddress, sourceAmount, destinationCurrency = "sol" } = await req.json();

  if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const amount = Number(sourceAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid source amount" }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured on this deployment. Set STRIPE_SECRET_KEY (and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) in your environment variables — you'll need a Stripe account with Crypto Onramp enabled.",
      },
      { status: 503 }
    );
  }

  try {
    const params = new URLSearchParams({
      "wallet_addresses[solana]": walletAddress,
      destination_currency: destinationCurrency,
      destination_network: "solana",
      source_amount: String(amount),
      source_currency: "usd",
    });

    const stripeRes = await fetch(`${STRIPE_API_BASE}/crypto/onramp_sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!stripeRes.ok) {
      const body = await stripeRes.text();
      console.error("Stripe onramp session error", stripeRes.status, body);
      return NextResponse.json({ error: "Stripe rejected the onramp request" }, { status: 502 });
    }

    const session = (await stripeRes.json()) as { id: string; client_secret: string };

    // Best-effort activity log. There are no user accounts and no required
    // database — if it's not configured, or the write fails for any reason,
    // the purchase still proceeds; only the dashboard's history list is
    // affected.
    prisma.transaction
      .create({
        data: {
          walletAddress,
          type: "BUY",
          status: "PENDING",
          provider: "stripe",
          providerSessionId: session.id,
          sourceAmount: amount,
          sourceCurrency: "usd",
          destinationCurrency,
        },
      })
      .catch((err) => console.error("Failed to log buy transaction (non-blocking)", err));

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error("Failed to create Stripe onramp session", err);
    return NextResponse.json({ error: "Failed to create onramp session" }, { status: 502 });
  }
}
