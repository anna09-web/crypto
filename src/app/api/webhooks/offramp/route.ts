import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Generic webhook receiver for the off-ramp provider (Kado / Coinbase
// Offramp / MoonPay). Verifies an HMAC signature header and updates the
// matching transaction's status. Adjust the header name and payload shape
// to match whichever provider you integrate.
export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-webhook-signature");
  const webhookSecret = process.env.OFFRAMP_WEBHOOK_SECRET;
  const rawBody = await req.text();

  if (webhookSecret) {
    const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    if (!signature || signature !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  const payload = JSON.parse(rawBody) as {
    sessionId: string;
    status: "pending" | "processing" | "completed" | "failed";
    destinationAmount?: string;
    txHash?: string;
  };

  await prisma.transaction.updateMany({
    where: { providerSessionId: payload.sessionId },
    data: {
      status: mapOfframpStatus(payload.status),
      destinationAmount: payload.destinationAmount ?? undefined,
      onChainTxSignature: payload.txHash ?? undefined,
    },
  });

  return NextResponse.json({ received: true });
}

function mapOfframpStatus(status: string): "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" {
  switch (status) {
    case "completed":
      return "COMPLETED";
    case "processing":
      return "PROCESSING";
    case "failed":
      return "FAILED";
    default:
      return "PENDING";
  }
}
