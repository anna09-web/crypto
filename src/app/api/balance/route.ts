import { NextRequest, NextResponse } from "next/server";
import { getSolBalance, isValidSolanaAddress } from "@/lib/solana";

export async function GET(req: NextRequest) {
  const walletAddress = req.nextUrl.searchParams.get("walletAddress");

  if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  try {
    const balance = await getSolBalance(walletAddress);
    return NextResponse.json({ balance });
  } catch (err) {
    console.error("Failed to fetch balance", err);
    return NextResponse.json({ error: "Failed to fetch balance" }, { status: 502 });
  }
}
