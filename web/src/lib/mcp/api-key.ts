import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const MCP_API_KEY_PREFIX = "rvl_";
export const MCP_API_KEY_PATTERN = /^rvl_[A-Za-z0-9_-]{40,}$/;

export function generateMcpApiKeyPlaintext(): string {
  return `${MCP_API_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashMcpApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext.trim()).digest("hex");
}

export function isValidMcpApiKeyFormat(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return false;
  return MCP_API_KEY_PATTERN.test(raw.trim());
}

export function maskMcpApiKeySuffix(plaintextOrSuffix: string): string {
  const s = plaintextOrSuffix.trim();
  if (s.length <= 4) return "••••";
  return `rvl_...${s.slice(-4)}`;
}

export function constantTimeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
