import { createHmac, timingSafeEqual } from "crypto";

import {
  isInviteExpired,
  loadTeamInviteByToken,
  type TeamInviteMembershipRow,
} from "@/lib/team/team-invite-by-token";

export const TEAM_GUEST_COOKIE = "rival_team_guest";
export const RIVAL_PREVIEW_ACTIVE_COOKIE = "rival_preview_active";

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

function signBody(body: string): Buffer {
  return createHmac("sha256", getGuestSessionSecret()).update(body).digest();
}

export function signGuestSession(payload: GuestSessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = signBody(body).toString("base64url");
  return `${body}.${sig}`;
}

export function verifyGuestSession(token: string): GuestSessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [body, sigPart] = parts;
  if (!body || !sigPart) return null;

  try {
    const expected = signBody(body);
    const actual = Buffer.from(sigPart, "base64url");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as GuestSessionPayload;
    if (!payload.inviteToken || !payload.ownerUserId || !payload.exp) return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function guestSessionExpiryMs(row: TeamInviteMembershipRow): number {
  const inviteExpiry = row.invite_token_expires_at
    ? Date.parse(row.invite_token_expires_at)
    : Date.now() + 30 * 86_400_000;
  const sevenDays = Date.now() + 7 * 86_400_000;
  return Math.min(inviteExpiry, sevenDays);
}

export async function validateGuestInviteAccess(
  inviteToken: string,
): Promise<
  | { ok: true; row: TeamInviteMembershipRow }
  | { ok: false; error: string; status: number }
> {
  const row = await loadTeamInviteByToken(inviteToken);
  if (!row) {
    return { ok: false, error: "Invite not found.", status: 404 };
  }

  if (row.status === "revoked") {
    return { ok: false, error: "This invite was revoked.", status: 410 };
  }

  if (row.status === "pending" && isInviteExpired(row)) {
    return { ok: false, error: "This invite has expired.", status: 410 };
  }

  if (row.status !== "pending" && row.status !== "active") {
    return { ok: false, error: "This invite is no longer valid.", status: 410 };
  }

  return { ok: true, row };
}

export function readGuestSessionFromCookies(
  getCookie: (name: string) => string | undefined,
): GuestSessionPayload | null {
  const raw = getCookie(TEAM_GUEST_COOKIE);
  if (!raw) return null;
  return verifyGuestSession(raw);
}

export function guestSessionCookieOptions(expiresAtMs: number) {
  const maxAge = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function buildGuestSessionCookie(row: TeamInviteMembershipRow): {
  value: string;
  expiresAtMs: number;
} {
  const expiresAtMs = guestSessionExpiryMs(row);
  const payload: GuestSessionPayload = {
    inviteToken: row.invite_token,
    ownerUserId: row.owner_user_id,
    exp: Math.floor(expiresAtMs / 1000),
  };
  return { value: signGuestSession(payload), expiresAtMs };
}

export function clearGuestSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

export function previewActiveCookieOptions(expiresAtMs: number) {
  return guestSessionCookieOptions(expiresAtMs);
}

export function clearPreviewActiveCookieOptions() {
  return clearGuestSessionCookieOptions();
}

export function readPreviewActiveFromCookies(
  getCookie: (name: string) => string | undefined,
): boolean {
  return getCookie(RIVAL_PREVIEW_ACTIVE_COOKIE) === "1";
}
