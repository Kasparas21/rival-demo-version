import type { NextRequest } from "next/server";
import { getAppUrl, getAppUrlMisconfigurationReason } from "@/lib/billing/config";
import { isLocalDevRequest } from "@/lib/auth/local-dev";
import { siteOriginFromRequest } from "@/lib/http/site-origin";

/**
 * Origin embedded in signup / magic-link / password-reset emails and passed to Supabase `redirectTo`.
 *
 * - On **localhost**, always use the request Host so confirmation links stay on local dev even when
 *   `NEXT_PUBLIC_APP_URL` is set to production (e.g. https://spy-rival.com for Polar).
 * - Otherwise prefer `NEXT_PUBLIC_APP_URL` when it looks real.
 * - If it’s still a tutorial placeholder (`your-domain.com`), infer Host from the request.
 */
export function authLinkOriginForRequest(request: NextRequest): string {
  const requestOrigin = siteOriginFromRequest(request);
  if (isLocalDevRequest(request)) {
    return requestOrigin;
  }
  const configured = getAppUrl();
  if (getAppUrlMisconfigurationReason(configured)) {
    return requestOrigin;
  }
  return configured;
}
