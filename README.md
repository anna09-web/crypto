# 100x

Buy SOL with a card, sell it back to fiat, and track it all from a wallet-connected dashboard.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- `@solana/wallet-adapter-react` with Phantom and Solflare registered explicitly
  (Backpack and other Wallet Standard wallets are auto-detected on top of those)
- `@solana/web3.js` for balance reads
- Stripe Crypto Onramp (`@stripe/crypto` + a direct call to Stripe's REST API)
  for buy-side fiat → SOL
- A separate off-ramp provider (Kado by default) for sell-side SOL → fiat, since
  Stripe's onramp is buy-only
- Postgres via Prisma — **optional**, purely for transaction history (see below)

There are no user accounts and no login: a connected wallet address is the
only identity the app needs.

## Getting started

```bash
npm install
npm run dev
```

That's it — buying and selling both work with zero configuration beyond a
Stripe account and (for selling) an off-ramp provider account. See
`.env.example` for what each variable does; nothing there is required just to
run the app, except:

- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — required to buy.
  You need a Stripe account with **Crypto Onramp** enabled
  (https://stripe.com/crypto), which Stripe currently gates behind an
  application. Without this set, `/buy` shows a clear "Stripe is not
  configured" error instead of silently failing.
- `OFFRAMP_PROVIDER_API_KEY` — required to sell. Same idea, for whichever
  off-ramp provider you sign up with (Kado by default).
- `DATABASE_URL` — optional. If set (and `npx prisma migrate dev` has been
  run), transactions are logged so the dashboard's history list has
  something to show. If it's unset, unreachable, or migrations haven't been
  run, buying and selling are completely unaffected — the dashboard just
  shows "No transactions yet."

## Architecture notes

- **Identity**: no accounts, no sessions, no sign-in step. Every route that
  needs to know "whose wallet is this" takes a `walletAddress` directly (from
  the request body for writes, a query param for reads) — the same address
  the wallet adapter already has from `useWallet()`.
- **Buy flow**: `POST /api/onramp/session` creates a Stripe Crypto Onramp
  session directly against Stripe's REST API (the `crypto/onramp_sessions`
  endpoint is in beta and not yet in the typed `stripe` SDK) and returns a
  `client_secret`; the client mounts Stripe's embedded onramp UI with
  `@stripe/crypto`. `/api/webhooks/stripe` listens for
  `crypto.onramp_session.*` events and updates the transaction row if one
  exists.
- **Sell flow**: Stripe has no crypto-to-fiat API, so `/api/offramp/session`
  calls a separate provider (Kado's session API by default — swap the fetch
  target in `src/app/api/offramp/session/route.ts` for Coinbase Offramp or
  MoonPay if you prefer). `/api/webhooks/offramp` is a generic HMAC-verified
  webhook receiver for that provider.
- **Transaction logging is best-effort**: both session routes write to
  Postgres via `prisma.transaction.create(...).catch(...)` — fire-and-forget.
  A missing or misconfigured database never blocks a buy or sell; it only
  means that trade won't show up in history.
- **Dashboard**: live SOL balance via `web3.js` (`/api/balance`), USD value via
  CoinGecko (`/api/price`), and transaction history from Postgres
  (`/api/transactions?walletAddress=...`, gracefully returning `[]` on any
  DB error).

## Compliance

Stripe and the off-ramp provider hold the money-transmitter licensing and
handle KYC/AML for their respective flows. Before taking this live with real
money, check whether your jurisdiction requires separate business
registration, and review each provider's partner terms of service.
