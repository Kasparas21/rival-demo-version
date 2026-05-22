import { NextResponse } from "next/server";
import { fetchLatestAdsLibraryFromUserCache } from "@/lib/ad-library/load-ads-library-from-user-cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** POST — load latest `ads_cache` rows for a domain (ignores client payload key mismatches). */
export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { domain?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const domain = body.domain?.trim() ?? "";
  if (!domain) {
    return NextResponse.json({ ok: false, error: "domain required" }, { status: 400 });
  }

  const response = await fetchLatestAdsLibraryFromUserCache(supabase, user.id, domain);
  if (!response) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, response });
}
