import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-4xl font-bold tracking-tight">100x</h1>
        <p className="mt-4 max-w-xl text-black/70">
          Connect a Solana wallet. Buy SOL with a card. Sell back to fiat. Track everything
          in one place — no accounts, no passwords, just your wallet.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StepCard n="01" title="Connect" body="Phantom, Solflare, or Backpack." />
        <StepCard n="02" title="Buy or Sell" body="Card to SOL via Stripe. SOL to bank via off-ramp." />
        <StepCard n="03" title="Track" body="Live balance and full transaction history." />
      </section>

      <section className="flex gap-4">
        <Link
          href="/buy"
          className="border border-black bg-black px-6 py-3 text-white hover:bg-white hover:text-black"
        >
          Buy SOL
        </Link>
        <Link href="/dashboard" className="border border-black px-6 py-3 hover:bg-black hover:text-white">
          View Dashboard
        </Link>
      </section>
    </div>
  );
}

function StepCard({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="border border-black p-4">
      <div className="text-xs text-black/50">{n}</div>
      <div className="mt-1 font-bold">{title}</div>
      <div className="mt-1 text-sm text-black/70">{body}</div>
    </div>
  );
}
