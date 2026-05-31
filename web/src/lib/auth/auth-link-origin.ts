import type { NextRequest } from "next/server";
import { getAppUrl, getAppUrlMisconfigurationReason } from "@/lib/billing/config";
import { isLocalDevRequest } from "@/lib/auth/local-dev";
import { siteOriginFromRequest } from "@/lib/http/site-origin";

/**
 * Public origin for the current browser request (auth emails, Polar return/success URLs, etc.).
 *
 * - On **localhost**, always use the request Host so flows stay on local dev even when
 *   `NEXT_PUBLIC_APP_URL` is set to production (e.g. https://spy-rival.com for Polar webhooks).
 * - Otherwise prefer `NEXT_PUBLIC_APP_URL` when it looks real.
 * - If it’s still a tutorial placeholder (`your-domain.com`), infer Host from the request.
 */
export function appOriginForRequest(request: NextRequest): string {
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

/** @alias appOriginForRequest — signup / reset links */
export const authLinkOriginForRequest = appOriginForRequest;
