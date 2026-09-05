"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import bs58 from "bs58";

export function WalletConnectButton() {
  const { publicKey, signMessage, connected } = useWallet();
  const [authenticated, setAuthenticated] = useState(false);
  const attemptedFor = useRef<string | null>(null);

  useEffect(() => {
    async function authenticate() {
      if (!connected || !publicKey || !signMessage) return;
      const walletAddress = publicKey.toBase58();

      if (attemptedFor.current === walletAddress) return;
      attemptedFor.current = walletAddress;

      const meRes = await fetch("/api/auth/me");
      const me = await meRes.json();
      if (me?.walletAddress === walletAddress) {
        setAuthenticated(true);
        return;
      }

      const nonceRes = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });
      const { message } = await nonceRes.json();

      const signature = await signMessage(new TextEncoder().encode(message));

      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          signature: bs58.encode(signature),
        }),
      });

      setAuthenticated(verifyRes.ok);
    }

    authenticate().catch((err) => {
      console.error("Wallet auth failed", err);
      setAuthenticated(false);
    });
  }, [connected, publicKey, signMessage]);

  return (
    <div className="flex items-center gap-2">
      <WalletMultiButton />
      {connected && (
        <span className="text-xs uppercase tracking-wide">
          {authenticated ? "✓ verified" : "verifying…"}
        </span>
      )}
    </div>
  );
}
