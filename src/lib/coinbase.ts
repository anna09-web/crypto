import crypto from "crypto";
import jwt from "jsonwebtoken";

// Coinbase Developer Platform (CDP) auth: every request is signed as a
// short-lived ES256 JWT built from the API key name + EC private key,
// rather than a static bearer token. See:
// https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/auth
const API_HOST = "api.coinbase.com";

// Normalizes the handful of ways a multi-line PEM tends to arrive in a
// pasted env var: surrounding quotes copied along with the value, an
// escaped "\n" sequence (typing it as literal backslash-n), or Vercel's
// env var textarea preserving real newlines directly — all are accepted.
function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }
  key = key.replace(/\\n/g, "\n");
  if (!key.endsWith("\n")) key += "\n";
  return key;
}

function getCredentials() {
  const keyName = process.env.COINBASE_API_KEY_NAME;
  const rawPrivateKey = process.env.COINBASE_API_PRIVATE_KEY;
  if (!keyName || !rawPrivateKey) {
    throw new Error(
      "Coinbase is not configured — set COINBASE_API_KEY_NAME and COINBASE_API_PRIVATE_KEY."
    );
  }

  const privateKey = normalizePrivateKey(rawPrivateKey);
  if (!privateKey.startsWith("-----BEGIN")) {
    throw new Error(
      `COINBASE_API_PRIVATE_KEY doesn't look like a PEM key (should start with "-----BEGIN"). ` +
        `Got: "${privateKey.slice(0, 20)}..." — check for extra quoting or missing newlines.`
    );
  }

  return { keyName, privateKey };
}

function buildJwt(method: string, path: string): string {
  const { keyName, privateKey } = getCredentials();
  const now = Math.floor(Date.now() / 1000);

  try {
    return jwt.sign(
      {
        iss: "cdp",
        sub: keyName,
        nbf: now,
        exp: now + 120,
        uri: `${method} ${API_HOST}${path}`,
      },
      privateKey,
      {
        algorithm: "ES256",
        header: {
          alg: "ES256",
          kid: keyName,
          nonce: crypto.randomBytes(16).toString("hex"),
        } as unknown as jwt.JwtHeader,
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to sign a Coinbase request JWT — COINBASE_API_PRIVATE_KEY is likely malformed (${message})`
    );
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = buildJwt(method, path);
  const res = await fetch(`https://${API_HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Coinbase API error ${res.status} on ${method} ${path}: ${text}`);
  }

  return res.json() as Promise<T>;
}

type Order = {
  order_id: string;
  status?: string;
  filled_size?: string;
  average_filled_price?: string;
};

export async function placeMarketBuy(usdAmount: string): Promise<Order> {
  const result = await request<{ success: boolean; order_id?: string; response?: Order; failure_reason?: string }>(
    "POST",
    "/api/v3/brokerage/orders",
    {
      client_order_id: crypto.randomUUID(),
      product_id: "SOL-USD",
      side: "BUY",
      order_configuration: {
        market_market_ioc: { quote_size: usdAmount },
      },
    }
  );

  if (!result.success || !result.order_id) {
    throw new Error(`Coinbase rejected the buy order: ${result.failure_reason ?? "unknown reason"}`);
  }

  return getOrder(result.order_id);
}

export async function getOrder(orderId: string): Promise<Order> {
  const result = await request<{ order: Order }>(
    "GET",
    `/api/v3/brokerage/orders/historical/${orderId}`
  );
  return result.order;
}

type Account = { uuid: string; currency: string; available_balance?: { value: string } };

export async function findAccount(currency: string): Promise<Account> {
  const result = await request<{ accounts: Account[] }>("GET", "/api/v3/brokerage/accounts");
  const account = result.accounts.find((a) => a.currency === currency);
  if (!account) {
    throw new Error(`No Coinbase account found for currency ${currency}`);
  }
  return account;
}

// Sending to an external address is a v2 (legacy "Coinbase App API") call,
// not part of Advanced Trade — Coinbase splits "trade" and "transfer out"
// permissions deliberately. This is the step most likely to need a specific
// permission enabled on the API key, or to be blocked by extra
// verification Coinbase requires on the account for external sends.
export async function sendCrypto(params: {
  accountId: string;
  toAddress: string;
  amount: string;
  currency: string;
}): Promise<{ id: string; status: string }> {
  const result = await request<{ data: { id: string; status: string } }>(
    "POST",
    `/v2/accounts/${params.accountId}/transactions`,
    {
      type: "send",
      to: params.toAddress,
      amount: params.amount,
      currency: params.currency,
      idem: crypto.randomUUID(),
    }
  );
  return result.data;
}
