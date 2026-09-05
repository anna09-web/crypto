import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, getUserBySessionToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = await getUserBySessionToken(token);

  if (!user) {
    return NextResponse.json(null);
  }

  return NextResponse.json({ walletAddress: user.walletAddress, id: user.id });
}
