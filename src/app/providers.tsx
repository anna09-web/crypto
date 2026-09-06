"use client";

import { ComponentType, FC, ReactNode, useMemo } from "react";
import {
  ConnectionProvider,
  ConnectionProviderProps,
  WalletProvider,
  WalletProviderProps,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletModalProviderProps,
} from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";

// The wallet adapter packages ship their own bundled @types/react (v19),
// which mismatches this project's @types/react (v18) and makes TypeScript
// reject them as JSX components. Recast against our own React types rather
// than fighting the nested dependency tree.
const SafeConnectionProvider = ConnectionProvider as unknown as ComponentType<ConnectionProviderProps>;
const SafeWalletProvider = WalletProvider as unknown as ComponentType<WalletProviderProps>;
const SafeWalletModalProvider = WalletModalProvider as unknown as ComponentType<WalletModalProviderProps>;

// Phantom and Solflare are registered explicitly (from their own standalone
// packages, not the @solana/wallet-adapter-wallets barrel) so the connect
// modal always lists them — with an "install" link if they're not detected
// — instead of showing a dead-end "you need a wallet" screen with no
// options. The barrel package was avoided because it also drags in the
// WalletConnect adapter's viem/Reown stack, which fires off network calls
// to WalletConnect's infrastructure on every page load. Backpack and other
// Wallet Standard wallets are still auto-detected on top of this list.
const DEFAULT_RPC_URL = "https://api.mainnet-beta.solana.com";

// ConnectionProvider constructs a `Connection` from this string immediately
// on render, on every page. If NEXT_PUBLIC_SOLANA_RPC_URL is set but
// malformed (a stray quote or missing protocol from a copy-paste, say),
// that throws synchronously and takes the entire app down. Validate it
// up front and fall back to the public endpoint instead of crashing.
function resolveEndpoint(): string {
  const configured = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (!configured) return DEFAULT_RPC_URL;

  try {
    const url = new URL(configured);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`unsupported protocol "${url.protocol}"`);
    }
    return configured;
  } catch (err) {
    console.error(
      `Invalid NEXT_PUBLIC_SOLANA_RPC_URL ("${configured}"), falling back to the public RPC endpoint.`,
      err
    );
    return DEFAULT_RPC_URL;
  }
}

export const Providers: FC<{ children: ReactNode }> = ({ children }) => {
  const endpoint = useMemo(resolveEndpoint, []);

  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <SafeConnectionProvider endpoint={endpoint}>
      <SafeWalletProvider wallets={wallets} autoConnect>
        <SafeWalletModalProvider>{children}</SafeWalletModalProvider>
      </SafeWalletProvider>
    </SafeConnectionProvider>
  );
};
