"use client";

import { useEffect, useRef } from "react";
import { loadStripeOnramp, StripeOnramp } from "@stripe/crypto";

let onrampPromise: Promise<StripeOnramp | null> | null = null;

function getStripeOnramp() {
  if (!onrampPromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
    onrampPromise = loadStripeOnramp(publishableKey);
  }
  return onrampPromise;
}

export function StripeOnrampEmbed({ clientSecret }: { clientSecret: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unmounted = false;

    getStripeOnramp().then((onramp) => {
      if (!onramp || unmounted || !containerRef.current) return;
      const session = onramp.createSession({ clientSecret });
      session.mount(containerRef.current);
    });

    return () => {
      unmounted = true;
    };
  }, [clientSecret]);

  return <div ref={containerRef} className="min-h-[600px] border border-black" />;
}
