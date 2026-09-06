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
export const Providers: FC<{ children: ReactNode }> = ({ children }) => {
  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";

  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <SafeConnectionProvider endpoint={endpoint}>
      <SafeWalletProvider wallets={wallets} autoConnect>
        <SafeWalletModalProvider>{children}</SafeWalletModalProvider>
      </SafeWalletProvider>
    </SafeConnectionProvider>
  );
};
