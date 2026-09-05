"use client";

import Link from "next/link";
import { WalletConnectButton } from "./WalletConnectButton";

export function Navbar() {
  return (
    <header className="border-b border-black">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          100x
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          <Link href="/buy" className="hover:underline">
            Buy
          </Link>
          <Link href="/sell" className="hover:underline">
            Sell
          </Link>
          <WalletConnectButton />
        </nav>
      </div>
    </header>
  );
}
