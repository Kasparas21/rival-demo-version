import { createHmac, timingSafeEqual } from "node:crypto";

import { getServerSupabaseEnv } from "@/lib/supabase/env";

const TTL_SECONDS = 60 * 60 * 6;

type AdImageClaims = {
  u: string;
  a: string;
  e: number;
};

function secret(): string {
  return getServerSupabaseEnv().supabaseSecretKey;
}

function b64url(value: Buffer | string): string {
  return Buffer.from(value).toString("base64url");
}

export function signAdImageToken(userId: string, adId: string, nowMs = Date.now()): string {
  const payload = b64url(
    JSON.stringify({
      u: userId,
      a: adId,
      e: Math.floor(nowMs / 1000) + TTL_SECONDS,
    } satisfies AdImageClaims),
  );
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyAdImageToken(token: string | null | undefined, nowMs = Date.now()): AdImageClaims | null {
  const raw = token?.trim() ?? "";
  const dot = raw.indexOf(".");
  if (dot <= 0) return null;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdImageClaims;
    if (!claims?.u || !claims.a || !claims.e) return null;
    if (claims.e * 1000 < nowMs) return null;
    return claims;
  } catch {
    return null;
  }
}

export function mcpAdPreviewUrl(appOrigin: string, userId: string, adId: string): string {
  const origin = appOrigin.replace(/\/$/, "");
  const token = signAdImageToken(userId, adId);
  return `${origin}/api/mcp/ad-image?token=${encodeURIComponent(token)}`;
}
