import { after, NextResponse } from "next/server";

import { hostOf, registrableDomain } from "@/lib/ad-account-discovery/score";
import { recommendCompetitors } from "@/lib/competitor-recommendations/run";
import {
  claimRun,
  emptyView,
  needsRun,
  readRecommendations,
  saveFailure,
  saveRun,
  viewOf,
} from "@/lib/competitor-recommendations/store";
import { isPlausiblePublicHostname } from "@/lib/onboarding/host";
import { parseAdsProfileSetup } from "@/lib/onboarding/workspace-ads-setup";
import { clientIp, hitRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
/** The run itself happens in `after()` and takes one to two minutes. */
export const maxDuration = 300;

/** New runs per user: each costs roughly $0.05–0.25. Cached results don't count. */
const RUN_LIMITS = [
  { windowSec: 60 * 60, max: 3 },
  { windowSec: 24 * 60 * 60, max: 6 },
] as const;

/** Guests (onboarding, before sign-up) can only start searches: a few per visitor, and a daily ceiling for all. */
const GUEST_LIMITS_PER_IP = [
  { windowSec: 60 * 60, max: 3 },
  { windowSec: 24 * 60 * 60, max: 5 },
] as const;
const GUEST_LIMITS_ALL = [{ windowSec: 24 * 60 * 60, max: 150 }] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type BrandSite = { domain: string; brandContext: string | null; markets: string[] };

function siteDomain(raw: string | null | undefined): string | null {
  const host = hostOf(raw);
  return host && isPlausiblePublicHostname(host) ? registrableDomain(host) : null;
}

/**
 * The website of one of the caller's brands: the one asked for, else their primary brand, else their
 * profile's. During onboarding, before anything is saved, the site they just entered (`requested`) is
 * allowed too, but never a site other than their own once one is saved.
 */
async function resolveBrandSite(
  supabase: Supabase,
  userId: string,
  brandId: string | null,
  requested: string | null,
): Promise<BrandSite | null> {
  const [{ data: brands }, { data: profile }] = await Promise.all([
    supabase
      .from("brands")
      .select("id, domain, brand_context, ads_profile_setup, is_primary, created_at")
      .eq("user_id", userId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("company_url").eq("id", userId).maybeSingle(),
  ]);
  const rows = brands ?? [];
  const brand = (brandId && UUID.test(brandId) ? rows.find((b) => b.id === brandId) : undefined) ?? rows[0];
  const requestedDomain = siteDomain(requested);
  const owned = [...rows.map((b) => siteDomain(b.domain)), siteDomain(profile?.company_url)].filter(
    (d): d is string => d != null,
  );

  let domain: string | null;
  let match: (typeof rows)[number] | undefined = brand;
  if (requestedDomain) {
    if (owned.length > 0 && !owned.includes(requestedDomain)) return null;
    domain = requestedDomain;
    match = rows.find((b) => siteDomain(b.domain) === requestedDomain);
  } else {
    domain = siteDomain(brand?.domain) ?? siteDomain(profile?.company_url);
  }
  if (!domain) return null;
  return {
    domain,
    brandContext: match?.brand_context ?? null,
    markets: parseAdsProfileSetup(match?.ads_profile_setup)?.adMarketCountryCodes ?? [],
  };
}

async function authed(): Promise<{ supabase: Supabase; userId: string } | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, userId: user.id } : null;
}

/** The stored recommendations for a brand's website, without starting anything. */
export async function GET(request: Request) {
  const auth = await authed();
  if (!auth) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const site = await resolveBrandSite(auth.supabase, auth.userId, params.get("brandId"), params.get("domain"));
  if (!site) return NextResponse.json({ ok: false, error: "Add your website to find competitors" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ...viewOf(await readRecommendations(site.domain), site.domain) });
  } catch (e) {
    console.error("[competitor-recommendations] read", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "Couldn't load recommendations" }, { status: 500 });
  }
}

/** Run the search in the background once this request has claimed it. */
function runInBackground(site: BrandSite): void {
  after(async () => {
    try {
      const run = await recommendCompetitors({
        url: site.domain,
        brandContext: site.brandContext,
        markets: site.markets,
      });
      await saveRun(site.domain, run);
      console.info("[competitor-recommendations] done", site.domain, `$${run.costUsd}`, `${run.durationMs}ms`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[competitor-recommendations] run failed", site.domain, message);
      await saveFailure(site.domain, message).catch(() => {});
    }
  });
}

/**
 * Guest onboarding: start the search as soon as the visitor enters their website, so it's ready by the
 * time they've signed up and paid. Guests only start it; results are read after sign-in.
 */
async function startForGuest(request: Request, rawDomain: unknown): Promise<NextResponse> {
  const domain = siteDomain(typeof rawDomain === "string" ? rawDomain : null);
  if (!domain) return NextResponse.json({ ok: false, error: "Invalid website" }, { status: 400 });
  try {
    const current = await readRecommendations(domain);
    if (!needsRun(current)) return NextResponse.json({ ok: true, status: viewOf(current, domain).status });
    const allowed =
      (await hitRateLimit(`competitor-recommendations:guest:${clientIp(request)}`, GUEST_LIMITS_PER_IP)) &&
      (await hitRateLimit("competitor-recommendations:guest:all", GUEST_LIMITS_ALL));
    if (!allowed) return NextResponse.json({ ok: false, error: "Too many searches" }, { status: 429 });
    if (await claimRun(domain, null, current)) runInBackground({ domain, brandContext: null, markets: [] });
    return NextResponse.json({ ok: true, status: "running" });
  } catch (e) {
    console.error("[competitor-recommendations] guest start", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "Couldn't start the search" }, { status: 500 });
  }
}

/** Start a run for a brand's website, unless a fresh one is stored or already running. */
export async function POST(request: Request) {
  let body: { brandId?: unknown; domain?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    /* no body: the primary brand */
  }
  const auth = await authed();
  if (!auth) {
    if (request.headers.get("x-rival-guest-onboarding") === "1") return startForGuest(request, body.domain);
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const site = await resolveBrandSite(
    auth.supabase,
    auth.userId,
    typeof body.brandId === "string" ? body.brandId : null,
    typeof body.domain === "string" ? body.domain : null,
  );
  if (!site) return NextResponse.json({ ok: false, error: "Add your website to find competitors" }, { status: 400 });

  try {
    const current = await readRecommendations(site.domain);
    if (!needsRun(current)) return NextResponse.json({ ok: true, ...viewOf(current, site.domain) });

    if (!(await hitRateLimit(`competitor-recommendations:${auth.userId}`, RUN_LIMITS))) {
      return NextResponse.json(
        { ok: false, error: "You've searched for competitors a lot today. Try again tomorrow." },
        { status: 429 },
      );
    }
    if (!(await claimRun(site.domain, auth.userId, current))) {
      return NextResponse.json({ ok: true, ...viewOf(await readRecommendations(site.domain), site.domain) });
    }
    runInBackground(site);

    return NextResponse.json({
      ok: true,
      ...emptyView(site.domain),
      status: "running",
      startedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[competitor-recommendations] start", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "Couldn't start the search" }, { status: 500 });
  }
}
