/** Short-lived client cookie so OAuth round-trips keep `next` when Supabase strips query params. */
export const OAUTH_NEXT_COOKIE = "rival_oauth_next";

/** Short-lived client cookie carrying tester invite through Google OAuth. */
export const OAUTH_TESTER_INVITE_COOKIE = "rival_oauth_tester";

const OAUTH_BRIDGE_MAX_AGE_SEC = 900;

function setClientCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${OAUTH_BRIDGE_MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

export function rememberOAuthNext(path: string): void {
  setClientCookie(OAUTH_NEXT_COOKIE, path);
}

export function rememberOAuthTesterInvite(inviteCode: string | null | undefined): void {
  const code = inviteCode?.trim().toLowerCase();
  if (!code) return;
  setClientCookie(OAUTH_TESTER_INVITE_COOKIE, code);
}
