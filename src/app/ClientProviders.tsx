"use client";

import dynamic from "next/dynamic";

// Wallet adapters (Phantom, Solflare) are browser-only — their constructors
// probe `window` for injected extensions. Rendered on the server during
// prerendering/static export, that crashes the build (every route fails
// identically, since this wraps the whole app). `ssr: false` keeps the
// entire wallet-aware tree out of server rendering; it only ever mounts in
// the browser after hydration.
const Providers = dynamic(() => import("./providers").then((mod) => mod.Providers), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-white text-black font-mono flex items-center justify-center">
      <span className="text-sm uppercase tracking-widest text-black/50">Loading…</span>
    </div>
  ),
});

export default Providers;
