"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

type Result = {
  solAmount: string;
  averagePrice?: string;
  sendId: string;
  sendStatus: string;
};

export function BuyForm() {
  const { publicKey, connected } = useWallet();
  const [amount, setAmount] = useState("50");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to complete the purchase.");
        return;
      }

      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="border border-black p-6">
        <div className="text-sm uppercase tracking-widest text-black/60">Purchase sent</div>
        <p className="mt-3 text-lg font-bold">{result.solAmount} SOL</p>
        {result.averagePrice && (
          <p className="mt-1 text-sm text-black/60">avg. price ${result.averagePrice}</p>
        )}
        <p className="mt-3 text-sm">
          Coinbase send status: <span className="font-bold">{result.sendStatus}</span>
        </p>
        <button
          onClick={() => setResult(null)}
          className="mt-6 border border-black px-4 py-2 text-sm hover:bg-black hover:text-white"
        >
          Buy more
        </button>
      </div>
    );
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
        {loading ? "Buying…" : connected ? "Buy SOL" : "Connect wallet first"}
      </button>
    </form>
  );
}
