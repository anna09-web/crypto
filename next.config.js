/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // @solana/wallet-adapter-wallets pulls in the WalletConnect adapter,
    // which uses pino for logging. pino's pretty-printer is an optional
    // dependency we never enable, but webpack still tries to resolve it —
    // alias it away instead of shipping the extra package.
    config.resolve.alias = {
      ...config.resolve.alias,
      "pino-pretty": false,
    };
    // viem's optional "tempo" chain config (pulled in transitively via the
    // WalletConnect adapter, which we don't otherwise use) does a dynamic
    // `require(expression)` that webpack can't statically analyze. It's
    // dead code for a Solana-only app — silence the warning rather than
    // pulling in the extra chain config.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /ox\/_esm\/tempo/ },
    ];
    return config;
  },
};

module.exports = nextConfig;
