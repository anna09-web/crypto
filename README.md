# 100x

Buy SOL, sell it back to fiat, and track it all from a wallet-connected dashboard.

This is built for **personal use** — one operator's own accounts, not a
customer-facing money-transmission product. The buy flow automates the
operator's own Coinbase account (a real market order, charged to whatever
card/bank is linked there) rather than going through a licensed onramp; see
**Compliance** below before pointing this at anyone but yourself.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- `@solana/wallet-adapter-react` with Phantom and Solflare registered explicitly
  (Backpack and other Wallet Standard wallets are auto-detected on top of those)
- `@solana/web3.js` for balance reads
- Coinbase Advanced Trade / CDP API for buy-side fiat → SOL (places a real
  order on the operator's own Coinbase account, then sends the SOL on-chain)
- A separate off-ramp provider (Kado by default) for sell-side SOL → fiat
- Postgres via Prisma — **optional**, purely for transaction history (see below)

There are no user accounts and no login: a connected wallet address is the
only identity the app needs.

## Getting started

```bash
npm install
npm run dev
```

See `.env.example` for what each variable does; nothing there is required
just to run the app, except:

- `COINBASE_API_KEY_NAME` / `COINBASE_API_PRIVATE_KEY` — required to buy.
  A CDP API key from **your own** Coinbase account
  (https://portal.cdp.coinbase.com), with trade and send/transfer
  permissions. Without this set, `/buy` shows a clear "Coinbase is not
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
- **Buy flow**: `POST /api/onramp/session` (`src/lib/coinbase.ts` has the
  Coinbase client) places a real IOC market buy for SOL-USD on the
  operator's Coinbase account, polls briefly for the fill, looks up the
  account's SOL balance, and calls Coinbase's send/transfer endpoint to move
  the filled amount to the requesting wallet — synchronously, in one
  request. There's no webhook for this flow; the response tells the client
  the outcome directly.
  - The send step uses a different Coinbase API (v2, "transfer out") than
    the trade step (Advanced Trade v3) — Coinbase splits those permissions
    deliberately. If sends fail, check that the API key has transfer/send
    permission enabled, and that the account doesn't require extra
    manual verification for external sends.
- **Sell flow**: `/api/offramp/session` calls a separate provider (Kado's
  session API by default — swap the fetch target in
  `src/app/api/offramp/session/route.ts` for Coinbase Offramp or MoonPay if
  you prefer). `/api/webhooks/offramp` is a generic HMAC-verified webhook
  receiver for that provider.
- **Transaction logging is best-effort**: both session routes write to
  Postgres via `prisma.transaction.create(...).catch(...)` — fire-and-forget.
  A missing or misconfigured database never blocks a buy or sell; it only
  means that trade won't show up in history.
- **Dashboard**: live SOL balance via `web3.js` (`/api/balance`), USD value via
  CoinGecko (`/api/price`), and transaction history from Postgres
  (`/api/transactions?walletAddress=...`, gracefully returning `[]` on any
  DB error).

## Compliance

The buy flow automates one person's own Coinbase account rather than acting
as a money transmitter — that's the whole reason it's viable without the
onramp licensing a customer-facing product would need. **This only holds if
the deployed app is used by its own operator, for their own funds.** The
moment it takes money from anyone else and hands them crypto in return, the
operator becomes the one legally responsible for money-transmitter
licensing and KYC/AML obligations most jurisdictions require for exactly
that activity. Don't repurpose this as a multi-user product without
building that layer (or switching the buy side back to a licensed onramp
like Stripe Crypto Onramp, MoonPay, or Transak).

The off-ramp provider on the sell side holds its own money-transmitter
licensing and handles KYC/AML for that flow. Review its partner terms of
service before relying on it.

Also review Coinbase's own API/account terms of service for automating
trades and sends via a personal account — this should be your own
verified account and your own funds.
