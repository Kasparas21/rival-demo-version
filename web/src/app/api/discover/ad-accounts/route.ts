import { NextResponse } from "next/server";

import { discoverAdAccounts } from "@/lib/ad-account-discovery/discover";
import { hitRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
/** Meta and Google lookups run in parallel; a slow Google lookup takes about 60–90 s. */
export const maxDuration = 300;

/** Each run spends Apify and vision credits (about $0.05–0.15). */
const LIMITS = [
  { windowSec: 60, max: 4 },
  { windowSec: 86_400, max: 40 },
] as const;

/** Ad accounts behind a competitor's website, each with the evidence for it, for the user to pick from. */
export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { url?: unknown; brandName?: unknown; market?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) return NextResponse.json({ ok: false, error: "url is required" }, { status: 400 });
  const market = typeof body.market === "string" && /^[A-Za-z]{2}$/.test(body.market) ? body.market.toUpperCase() : null;

  if (!(await hitRateLimit(`ad-accounts:${user.id}`, LIMITS))) {
    return NextResponse.json({ ok: false, error: "Too many lookups. Try again in a minute." }, { status: 429 });
  }

  try {
    const result = await discoverAdAccounts({
      url,
      brandName: typeof body.brandName === "string" ? body.brandName.slice(0, 120) : null,
      market,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Lookup failed";
    return NextResponse.json({ ok: false, error: message }, { status: message.includes("domain") ? 400 : 500 });
  }
}
