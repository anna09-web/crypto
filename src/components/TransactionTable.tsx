"use client";

import { useEffect, useState } from "react";

type Transaction = {
  id: string;
  type: "BUY" | "SELL";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  sourceAmount: string;
  sourceCurrency: string;
  destinationAmount: string | null;
  destinationCurrency: string;
  provider: string;
  onChainTxSignature: string | null;
  createdAt: string;
};

export function TransactionTable() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch("/api/transactions");
      if (res.ok && !cancelled) {
        const data = await res.json();
        setTransactions(data.transactions);
      }
      setLoading(false);
    }

    load();
    const interval = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return <div className="mt-8 text-sm text-black/60">Loading transactions…</div>;
  }

  if (transactions.length === 0) {
    return <div className="mt-8 text-sm text-black/60">No transactions yet.</div>;
  }

  return (
    <table className="mt-8 w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-black text-left uppercase tracking-wide text-xs">
          <th className="py-2 pr-4">Type</th>
          <th className="py-2 pr-4">Amount</th>
          <th className="py-2 pr-4">Status</th>
          <th className="py-2 pr-4">Date</th>
          <th className="py-2">Tx</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((tx) => (
          <tr key={tx.id} className="border-b border-black/20">
            <td className="py-2 pr-4">{tx.type}</td>
            <td className="py-2 pr-4">
              {tx.sourceAmount} {tx.sourceCurrency.toUpperCase()}
              {tx.destinationAmount
                ? ` → ${tx.destinationAmount} ${tx.destinationCurrency.toUpperCase()}`
                : ""}
            </td>
            <td className="py-2 pr-4">
              <StatusBadge status={tx.status} />
            </td>
            <td className="py-2 pr-4">{new Date(tx.createdAt).toLocaleString()}</td>
            <td className="py-2">
              {tx.onChainTxSignature ? (
                <a
                  href={`https://explorer.solana.com/tx/${tx.onChainTxSignature}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  view
                </a>
              ) : (
                "—"
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatusBadge({ status }: { status: Transaction["status"] }) {
  return <span className="border border-black px-2 py-0.5 text-xs uppercase">{status}</span>;
}
