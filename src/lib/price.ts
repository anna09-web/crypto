export async function getSolUsdPrice(): Promise<number | null> {
  try {
    const base =
      process.env.NEXT_PUBLIC_COINGECKO_API_URL ?? "https://api.coingecko.com/api/v3";
    const res = await fetch(`${base}/simple/price?ids=solana&vs_currencies=usd`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.solana?.usd ?? null;
  } catch {
    return null;
  }
}
