import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// Stripe requires the raw request body for signature verification.
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type.startsWith("crypto.onramp_session")) {
    const session = event.data.object as {
      id: string;
      status: string;
      transaction_details?: {
        destination_amount?: string;
        transaction_hash?: string;
      };
    };

    const status = mapStripeStatus(session.status);

    await prisma.transaction.updateMany({
      where: { providerSessionId: session.id },
      data: {
        status,
        destinationAmount: session.transaction_details?.destination_amount ?? undefined,
        onChainTxSignature: session.transaction_details?.transaction_hash ?? undefined,
      },
    });
  }

  return NextResponse.json({ received: true });
}

function mapStripeStatus(status: string): "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" {
  switch (status) {
    case "fulfillment_complete":
      return "COMPLETED";
    case "fulfillment_processing":
    case "requires_payment":
      return "PROCESSING";
    case "rejected":
      return "FAILED";
    default:
      return "PENDING";
  }
}
