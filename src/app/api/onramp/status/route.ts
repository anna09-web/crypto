import { NextResponse } from "next/server";
import { findAccount } from "@/lib/coinbase";

// Read-only connectivity check: confirms COINBASE_API_KEY_NAME and
// COINBASE_API_PRIVATE_KEY are set correctly and the key can actually
// authenticate against Coinbase, without placing any order or moving any
// money. Deliberately never returns a balance — just whether the
// credentials work and whether a SOL account exists to send from.
export async function GET() {
  if (!process.env.COINBASE_API_KEY_NAME || !process.env.COINBASE_API_PRIVATE_KEY) {
    return NextResponse.json(
      { ok: false, error: "COINBASE_API_KEY_NAME / COINBASE_API_PRIVATE_KEY not set" },
      { status: 503 }
    );
  }

  try {
    await findAccount("SOL");
    return NextResponse.json({ ok: true, message: "Coinbase credentials are valid." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
