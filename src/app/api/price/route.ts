import { NextResponse } from "next/server";
import { getSolUsdPrice } from "@/lib/price";

export async function GET() {
  const price = await getSolUsdPrice();
  return NextResponse.json({ price });
}
