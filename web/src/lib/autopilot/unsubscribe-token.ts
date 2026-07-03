import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_VERSION = "ap1";

function secret(): string {
  const s =
    process.env.AUTOPILOT_UNSUBSCRIBE_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();
  if (!s) throw new Error("AUTOPILOT_UNSUBSCRIBE_SECRET or CRON_SECRET required for autopilot tokens");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createAutopilotUnsubscribeToken(userId: string): string {
  const uid = userId.trim();
  if (!uid) throw new Error("userId required");
  const payload = `${TOKEN_VERSION}.${uid}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyAutopilotUnsubscribeToken(token: string): string | null {
  const raw = token.trim();
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [version, userId, sig] = parts;
  if (version !== TOKEN_VERSION || !userId?.trim() || !sig) return null;
  const payload = `${version}.${userId}`;
  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return null;
  }
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return userId.trim();
}

export function buildAutopilotUnsubscribeUrl(appOrigin: string, userId: string): string {
  const base = appOrigin.replace(/\/$/, "");
  const token = createAutopilotUnsubscribeToken(userId);
  return `${base}/api/autopilot/unsubscribe?token=${encodeURIComponent(token)}`;
}
