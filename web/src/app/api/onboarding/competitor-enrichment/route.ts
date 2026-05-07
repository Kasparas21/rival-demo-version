import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { enrichCompetitorDomainsForAds } from "@/lib/onboarding/firecrawl-brand-preview";
import { isPlausiblePublicHostname, normalizedWorkspaceHost } from "@/lib/onboarding/host";

export const maxDuration = 120;

type Body = { domains?: string[] };

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const raw = Array.isArray(body.domains) ? body.domains : [];
  const domains = raw
    .map((d) => normalizedWorkspaceHost(String(d ?? "").trim()))
    .filter((d): d is string => !!d && isPlausiblePublicHostname(d));

  if (domains.length === 0) {
    return NextResponse.json({ ok: false, error: "No valid domains" }, { status: 400 });
  }

  const result = await enrichCompetitorDomainsForAds(domains);
  if (!result.ok) {
    return NextResponse.json({ ok: true, partial: true, byDomain: {}, message: result.error }, { status: 200 });
  }

  return NextResponse.json({ ok: true, partial: false, byDomain: result.byDomain });
}
