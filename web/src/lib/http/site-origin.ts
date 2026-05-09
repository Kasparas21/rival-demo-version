import type { NextRequest } from "next/server";

/**
 * Origin inferred from the incoming request (Host / `x-forwarded-*`).
 * For auth callbacks and outbound email links prefer `getAppUrl()` from `@/lib/billing/config` so redirects match Supabase Auth allowlisting.
 */
export function siteOriginFromRequest(request: NextRequest): string {
  const rawHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("host")?.trim() ??
    "localhost:3000";
  const protoHeader = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = protoHeader || (rawHost.startsWith("localhost") || rawHost.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${rawHost}`;
}
