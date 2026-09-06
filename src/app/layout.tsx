import type { Metadata } from "next";
import "./globals.css";
import Providers from "./ClientProviders";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "100x",
  description: "Buy and sell SOL with fiat, straight to your wallet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black font-mono antialiased">
        <Providers>
          <Navbar />
          <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
