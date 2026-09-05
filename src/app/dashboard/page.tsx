"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { BalanceCard } from "@/components/BalanceCard";
import { TransactionTable } from "@/components/TransactionTable";

export default function DashboardPage() {
  const { publicKey, connected } = useWallet();

  if (!connected || !publicKey) {
    return (
      <div className="border border-black p-6 text-sm">
        Connect your wallet to view your dashboard.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="mt-6">
        <BalanceCard walletAddress={publicKey.toBase58()} />
      </div>
      <h2 className="mt-10 text-lg font-bold">History</h2>
      <TransactionTable />
    </div>
  );
}
