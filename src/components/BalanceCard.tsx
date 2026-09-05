"use client";

import { useEffect, useState } from "react";

export function BalanceCard({ walletAddress }: { walletAddress: string }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [usdPrice, setUsdPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [balanceRes, priceRes] = await Promise.all([
        fetch(`/api/balance?walletAddress=${walletAddress}`),
        fetch("/api/price").catch(() => null),
      ]);

      if (!cancelled) {
        if (balanceRes.ok) {
          const data = await balanceRes.json();
          setBalance(data.balance);
        }
        if (priceRes && priceRes.ok) {
          const data = await priceRes.json();
          setUsdPrice(data.price);
        }
        setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [walletAddress]);

  const usdValue = balance !== null && usdPrice !== null ? balance * usdPrice : null;

  return (
    <div className="border border-black p-6">
      <div className="text-xs uppercase tracking-widest text-black/60">Wallet</div>
      <div className="mt-1 text-sm">{truncate(walletAddress)}</div>

      <div className="mt-6 text-xs uppercase tracking-widest text-black/60">SOL Balance</div>
      <div className="mt-1 text-3xl font-bold">
        {loading ? "…" : balance !== null ? balance.toFixed(4) : "—"} SOL
      </div>
      <div className="mt-1 text-sm text-black/60">
        {usdValue !== null ? `≈ $${usdValue.toFixed(2)} USD` : ""}
      </div>
    </div>
  );
}

function truncate(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}
