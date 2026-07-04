import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const TTL_MS = 10 * 60 * 1000;

export type IntegrationOAuthReturnTo = "settings" | "modal";

export type IntegrationOAuthStatePayload = {
  user_id: string;
  ts: number;
  nonce: string;
  return_to: IntegrationOAuthReturnTo;
};

function secret(): string {
  const s =
    process.env.INTEGRATIONS_OAUTH_STATE_SECRET?.trim() ||
    process.env.AUTOPILOT_UNSUBSCRIBE_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();
  if (!s) {
    throw new Error("INTEGRATIONS_OAUTH_STATE_SECRET or a fallback signing secret is required");
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createIntegrationOAuthState(
  userId: string,
  returnTo: IntegrationOAuthReturnTo = "settings",
): string {
  const payload: IntegrationOAuthStatePayload = {
    user_id: userId.trim(),
    ts: Date.now(),
    nonce: randomBytes(16).toString("base64url"),
    return_to: returnTo,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyIntegrationOAuthState(state: string): IntegrationOAuthStatePayload | null {
  const raw = state.trim();
  if (!raw) return null;

  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const encoded = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!encoded || !sig) return null;

  let expected: string;
  try {
    expected = sign(encoded);
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

  let parsed: IntegrationOAuthStatePayload;
  try {
    parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as IntegrationOAuthStatePayload;
  } catch {
    return null;
  }

  if (!parsed.user_id?.trim() || !parsed.nonce || typeof parsed.ts !== "number") return null;
  if (parsed.return_to !== "settings" && parsed.return_to !== "modal") {
    parsed.return_to = "settings";
  }
  if (Date.now() - parsed.ts > TTL_MS) return null;

  return parsed;
}
