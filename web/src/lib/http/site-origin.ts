import type { NextRequest } from "next/server";

/** Public site origin for redirects and magic links (`https://…` or `http://localhost:…`). */
export function siteOriginFromRequest(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const proto =
    request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
