import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function decodeHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * The visitor's city and country from Vercel's edge headers. Local dev has neither, so outside
 * production `?city=Vilnius&country=LT` stands in for them.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const devOverride = process.env.NODE_ENV !== "production";
  return NextResponse.json(
    {
      city:
        decodeHeader(request.headers.get("x-vercel-ip-city")) ??
        (devOverride ? params.get("city") : null),
      country:
        request.headers.get("x-vercel-ip-country") ??
        (devOverride ? params.get("country") : null),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
