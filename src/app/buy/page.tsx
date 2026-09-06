import { BuyForm } from "@/components/BuyForm";

export default function BuyPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Buy SOL</h1>
      <p className="mt-2 text-sm text-black/70">
        Places a real market buy on the linked Coinbase account and sends the SOL directly
        to your connected wallet.
      </p>
      <div className="mt-6">
        <BuyForm />
      </div>
    </div>
  );
}
