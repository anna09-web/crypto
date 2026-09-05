import crypto from "crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "100x_session";

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory nonce store. Fine for a single-instance deployment; swap for
// Redis/Postgres-backed storage if running multiple server instances.
const nonces = new Map<string, { nonce: string; expiresAt: number }>();

export function createNonce(walletAddress: string): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  nonces.set(walletAddress, { nonce, expiresAt: Date.now() + NONCE_TTL_MS });
  return nonce;
}

export function buildSignMessage(walletAddress: string, nonce: string): string {
  return `100x wants you to sign in with your Solana account:\n${walletAddress}\n\nNonce: ${nonce}`;
}

export function consumePendingMessage(walletAddress: string): string | null {
  const entry = nonces.get(walletAddress);
  nonces.delete(walletAddress);
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return buildSignMessage(walletAddress, entry.nonce);
}

export function verifySignature(
  message: string,
  signatureBase58: string,
  walletAddressBase58: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signatureBase58);
    const publicKeyBytes = bs58.decode(walletAddressBase58);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return token;
}

export async function getUserBySessionToken(token: string | undefined | null) {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}
