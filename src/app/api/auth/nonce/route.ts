import { NextRequest, NextResponse } from "next/server";
import { buildSignMessage, createNonce } from "@/lib/auth";
import { isValidSolanaAddress } from "@/lib/solana";

export async function POST(req: NextRequest) {
  const { walletAddress } = await req.json();

  if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const nonce = createNonce(walletAddress);
  const message = buildSignMessage(walletAddress, nonce);

  return NextResponse.json({ message });
}
