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
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";

// The wallet adapter packages ship their own bundled @types/react (v19),
// which mismatches this project's @types/react (v18) and makes TypeScript
// reject them as JSX components. Recast against our own React types rather
// than fighting the nested dependency tree.
const SafeConnectionProvider = ConnectionProvider as unknown as ComponentType<ConnectionProviderProps>;
const SafeWalletProvider = WalletProvider as unknown as ComponentType<WalletProviderProps>;
const SafeWalletModalProvider = WalletModalProvider as unknown as ComponentType<WalletModalProviderProps>;

// Backpack (and other Wallet Standard-compliant wallets) are auto-detected
// by the wallet adapter at runtime and don't need an explicit adapter here.
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
