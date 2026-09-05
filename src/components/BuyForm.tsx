"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { StripeOnrampEmbed } from "./StripeOnrampEmbed";

export function BuyForm() {
  const { publicKey, connected } = useWallet();
  const [amount, setAmount] = useState("50");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!connected || !publicKey) {
      setError("Connect your wallet first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/onramp/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          sourceAmount: amount,
          destinationCurrency: "sol",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to start buy flow.");
        return;
      }

      setClientSecret(data.clientSecret);
    } finally {
      setLoading(false);
    }
  }

  if (clientSecret) {
    return <StripeOnrampEmbed clientSecret={clientSecret} />;
  }

  return (
    <form onSubmit={handleSubmit} className="border border-black p-6">
      <label className="text-xs uppercase tracking-widest text-black/60">
        Amount (USD)
      </label>
      <input
        type="number"
        min="10"
        step="1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="mt-2 w-full border border-black bg-white p-3 text-lg outline-none"
      />

      {error && <p className="mt-3 text-sm text-black">Error: {error}</p>}

      <button
        type="submit"
        disabled={loading || !connected}
        className="mt-6 w-full border border-black bg-black py-3 text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Preparing…" : connected ? "Continue to Stripe" : "Connect wallet first"}
      </button>
    </form>
  );
}
