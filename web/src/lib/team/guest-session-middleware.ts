/**
 * Edge-safe guest cookie helpers for Next.js middleware.
 * Verify signature + expiry only — no DB calls. API routes re-validate invites.
 */
export const TEAM_GUEST_COOKIE = "rival_team_guest";

export type GuestSessionPayload = {
  inviteToken: string;
  ownerUserId: string;
  exp: number;
};

function getGuestSessionSecret(): string {
  return (
    process.env.RIVAL_TEAM_GUEST_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "dev-guest-session-secret"
  );
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function verifyGuestCookieSignature(body: string, sigPart: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getGuestSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return bytesToBase64Url(new Uint8Array(mac)) === sigPart;
}

export async function readGuestSessionFromRequest(
  getCookie: (name: string) => string | undefined,
): Promise<GuestSessionPayload | null> {
  const raw = getCookie(TEAM_GUEST_COOKIE);
  if (!raw) return null;

  const parts = raw.split(".");
  if (parts.length !== 2) return null;

  const [body, sigPart] = parts;
  if (!body || !sigPart) return null;

  if (!(await verifyGuestCookieSignature(body, sigPart))) return null;

  try {
    const json = new TextDecoder().decode(base64UrlToBytes(body));
    const payload = JSON.parse(json) as GuestSessionPayload;
    if (!payload.inviteToken || !payload.ownerUserId || !payload.exp) return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function hasValidGuestCookie(
  getCookie: (name: string) => string | undefined,
): Promise<boolean> {
  return (await readGuestSessionFromRequest(getCookie)) !== null;
}
