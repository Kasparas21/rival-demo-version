import type { NextRequest } from "next/server";

export function isLocalDevHostname(hostname: string): boolean {
  const hn = hostname.toLowerCase();
  return hn === "localhost" || hn === "127.0.0.1" || hn === "[::1]";
}

export function isLocalDevRequest(request: NextRequest): boolean {
  return isLocalDevHostname(request.nextUrl.hostname);
}

/** Matches /api/auth/dev-instant-login and other local-only dev routes. */
export function isDevToolsRouteEnabled(request: NextRequest): boolean {
  if (process.env.DEV_INSTANT_EMAIL_LOGIN === "false") return false;
  if (process.env.NODE_ENV !== "production") return true;
  return isLocalDevRequest(request);
}

export function canReplayOnboardingInDev(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_REPLAY_ONBOARDING === "true";
}
