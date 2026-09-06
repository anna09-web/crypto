import crypto from "crypto";
import jwt from "jsonwebtoken";

// Coinbase Developer Platform (CDP) auth: every request is signed as a
// short-lived ES256 JWT built from the API key name + EC private key,
// rather than a static bearer token. See:
// https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/auth
const API_HOST = "api.coinbase.com";

function getCredentials() {
  const keyName = process.env.COINBASE_API_KEY_NAME;
  const privateKey = process.env.COINBASE_API_PRIVATE_KEY;
  if (!keyName || !privateKey) {
    throw new Error(
      "Coinbase is not configured — set COINBASE_API_KEY_NAME and COINBASE_API_PRIVATE_KEY."
    );
  }
  // Vercel env vars can't hold literal newlines cleanly; the PEM is stored
  // with escaped "\n" sequences and unescaped here.
  return { keyName, privateKey: privateKey.replace(/\\n/g, "\n") };
}

function buildJwt(method: string, path: string): string {
  const { keyName, privateKey } = getCredentials();
  const now = Math.floor(Date.now() / 1000);

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
