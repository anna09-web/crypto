import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, consumePendingMessage, createSession, verifySignature } from "@/lib/auth";
import { isValidSolanaAddress } from "@/lib/solana";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { walletAddress, signature } = await req.json();

  if (!walletAddress || !isValidSolanaAddress(walletAddress) || !signature) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const message = consumePendingMessage(walletAddress);
  if (!message) {
    return NextResponse.json({ error: "Nonce expired or not found" }, { status: 400 });
  }

  const valid = verifySignature(message, signature, walletAddress);
  if (!valid) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
  }

  const user = await prisma.user.upsert({
    where: { walletAddress },
    create: { walletAddress },
    update: {},
  });

  const token = await createSession(user.id);

  const res = NextResponse.json({ ok: true, walletAddress: user.walletAddress });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
