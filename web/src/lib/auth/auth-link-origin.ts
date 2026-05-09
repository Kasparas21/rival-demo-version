import type { NextRequest } from "next/server";
import { getAppUrl, getAppUrlMisconfigurationReason } from "@/lib/billing/config";
import { siteOriginFromRequest } from "@/lib/http/site-origin";

/**
 * Origin embedded in signup / magic-link / password-reset emails and passed to Supabase `redirectTo`.
 *
 * Prefer `NEXT_PUBLIC_APP_URL` when it looks real. If it’s still a tutorial placeholder (e.g.
 * `your-domain.com`), use the incoming request Host so localhost and preview URLs work during dev.
 */
export function authLinkOriginForRequest(request: NextRequest): string {
  const configured = getAppUrl();
  if (getAppUrlMisconfigurationReason(configured)) {
    return siteOriginFromRequest(request);
  }
  return configured;
}
