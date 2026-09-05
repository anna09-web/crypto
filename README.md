# 100x

Buy SOL with a card, sell it back to fiat, and track it all from a wallet-connected dashboard.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- `@solana/wallet-adapter-react` (Phantom, Solflare, Backpack)
- `@solana/web3.js` for balance reads
- Stripe Crypto Onramp (`@stripe/crypto` + `stripe`) for buy-side fiat → SOL
- A separate off-ramp provider (Kado by default) for sell-side SOL → fiat, since
  Stripe's onramp is buy-only
- Postgres via Prisma for users/sessions/transactions
- Wallet-signature auth (sign a message, no passwords)

## Getting started

```bash
npm install
cp .env.example .env
# fill in STRIPE_SECRET_KEY, DATABASE_URL, etc.
npx prisma migrate dev --name init
npm run dev
```

## Architecture notes

- **Auth**: `/api/auth/nonce` issues a one-time nonce, the client signs a message
  with the connected wallet, `/api/auth/verify` checks the signature with
  `tweetnacl` and sets an httpOnly session cookie. No passwords, no separate
  identity system — the wallet *is* the account.
- **Buy flow**: `/api/onramp/session` creates a Stripe Crypto Onramp session
  server-side and returns a `client_secret`; the client mounts Stripe's
  embedded onramp UI with `@stripe/crypto`. `/api/webhooks/stripe` listens for
  `crypto.onramp_session.*` events and updates the transaction row.
- **Sell flow**: Stripe has no crypto-to-fiat API, so `/api/offramp/session`
  calls a separate provider (Kado's session API by default — swap the fetch
  target in `src/app/api/offramp/session/route.ts` for Coinbase Offramp or
  MoonPay if you prefer). `/api/webhooks/offramp` is a generic HMAC-verified
  webhook receiver for that provider.
- **Dashboard**: live SOL balance via `web3.js` (`/api/balance`), USD value via
  CoinGecko (`/api/price`), and transaction history from Postgres
  (`/api/transactions`).

## Compliance

Stripe and the off-ramp provider hold the money-transmitter licensing and
handle KYC/AML for their respective flows. Before taking this live with real
money, check whether your jurisdiction requires separate business
registration, and review each provider's partner terms of service.
