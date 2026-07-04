import { NextResponse, type NextRequest } from "next/server";

import type { IntegrationOAuthReturnTo } from "@/lib/integrations/oauth-state";

export function integrationOAuthRedirect(
  origin: string,
  returnTo: IntegrationOAuthReturnTo,
  params: Record<string, string>,
): NextResponse {
  const base =
    returnTo === "modal" ? `${origin}/dashboard` : `${origin}/dashboard/settings/autopilot`;
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export function parseOAuthReturnTo(value: string | null): IntegrationOAuthReturnTo {
  return value === "modal" ? "modal" : "settings";
}

export function oauthConnectFailureRedirect(
  origin: string,
  returnTo: IntegrationOAuthReturnTo = "settings",
): NextResponse {
  return integrationOAuthRedirect(origin, returnTo, { error: "slack_connect_failed" });
}

export function oauthConnectFailureRedirectFromRequest(request: NextRequest): NextResponse {
  const origin = request.nextUrl.origin;
  const returnTo = parseOAuthReturnTo(request.nextUrl.searchParams.get("return_to"));
  return oauthConnectFailureRedirect(origin, returnTo);
}
