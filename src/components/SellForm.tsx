"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export function SellForm() {
  const { publicKey, connected } = useWallet();
  const [amount, setAmount] = useState("1");
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null);
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
      const res = await fetch("/api/offramp/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          sourceAmount: amount,
          sourceCurrency: "sol",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to start sell flow.");
        return;
      }

      setWidgetUrl(data.widgetUrl);
    } finally {
      setLoading(false);
    }
  }

  if (widgetUrl) {
    return (
      <div className="border border-black">
        <iframe src={widgetUrl} className="h-[600px] w-full" title="Off-ramp provider" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-black p-6">
      <label className="text-xs uppercase tracking-widest text-black/60">Amount (SOL)</label>
      <input
        type="number"
        min="0.01"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="mt-2 w-full border border-black bg-white p-3 text-lg outline-none"
      />

      <p className="mt-3 text-xs text-black/60">
        Sell orders are processed by a third-party off-ramp provider and typically settle to
        your bank in 1–3 business days. Stripe does not support crypto-to-fiat conversion.
      </p>

      {error && <p className="mt-3 text-sm text-black">Error: {error}</p>}

      <button
        type="submit"
        disabled={loading || !connected}
        className="mt-6 w-full border border-black bg-black py-3 text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Preparing…" : connected ? "Continue to off-ramp" : "Connect wallet first"}
      </button>
    </form>
  );
}
