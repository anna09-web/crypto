import { SellForm } from "@/components/SellForm";

export default function SellPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Sell SOL</h1>
      <p className="mt-2 text-sm text-black/70">
        Sell orders are handled by a separate off-ramp provider, since Stripe Crypto Onramp
        is buy-only.
      </p>
      <div className="mt-6">
        <SellForm />
      </div>
    </div>
  );
}
