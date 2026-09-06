import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidSolanaAddress } from "@/lib/solana";

export async function GET(req: NextRequest) {
  const walletAddress = req.nextUrl.searchParams.get("walletAddress");

  if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  try {
    const transactions = await prisma.transaction.findMany({
      where: { walletAddress },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ transactions });
  } catch (err) {
    // No database configured, or it's unreachable — history just shows as
    // empty rather than breaking the dashboard.
    console.error("Failed to load transactions (non-blocking)", err);
    return NextResponse.json({ transactions: [] });
  }
}
