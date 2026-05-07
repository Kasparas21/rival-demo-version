import { NextResponse } from "next/server";
import { ensureUserProfile } from "@/lib/auth/profile";
import type { SavedCompetitorPayload } from "@/lib/account/types";
import { getBillingEntitlement } from "@/lib/billing/entitlements";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MAX_WATCHED_COMPETITORS, normalizeCompetitorSlug } from "@/lib/sidebar-competitors";

function normalizeCompetitor(input: SavedCompetitorPayload): SavedCompetitorPayload {
  return {
    slug: input.slug.trim().toLowerCase(),
    name: input.name.trim(),
    logoUrl: input.logoUrl?.trim() || undefined,
    pending: Boolean(input.pending),
    brand:
      input.brand?.name && input.brand.domain
        ? {
            name: input.brand.name.trim(),
            domain: input.brand.domain.trim().toLowerCase(),
            logoUrl: input.brand.logoUrl?.trim() || undefined,
          }
        : undefined,
  };
}

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null };
  }

  await ensureUserProfile(supabase, user);
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ competitors: [] });
  }

  const { data, error } = await supabase
    .from("saved_competitors")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(MAX_WATCHED_COMPETITORS);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const competitors = (data ?? []).map((row) => ({
    slug: row.slug,
    name: row.name,
    ...(row.logo_url ? { logoUrl: row.logo_url } : {}),
    ...(row.brand_name && row.brand_domain
      ? {
          brand: {
            name: row.brand_name,
            domain: row.brand_domain,
            ...(row.brand_logo_url ? { logoUrl: row.brand_logo_url } : {}),
          },
        }
      : {}),
    pending: row.pending,
    ...(row.last_scraped_at ? { lastScrapedAt: row.last_scraped_at } : {}),
  }));

  return NextResponse.json({ competitors });
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const entitlement = await getBillingEntitlement(supabase, user.id);
  if (!entitlement.hasAccess) {
    return NextResponse.json(
      {
        ok: false,
        code: "subscription_required",
        error: "Start your subscription to save monitored competitors.",
        checkoutUrl: "/checkout",
      },
      { status: 402 },
    );
  }
  const maxWatchedCompetitors = entitlement.limits.maxWatchedCompetitors;

  const body = (await request.json()) as {
    competitor?: SavedCompetitorPayload;
    competitors?: SavedCompetitorPayload[];
  };

  const payload = Array.isArray(body.competitors)
    ? body.competitors
    : body.competitor
      ? [body.competitor]
      : [];

  if (payload.length === 0) {
    return NextResponse.json({ error: "No competitors provided" }, { status: 400 });
  }

  const items = payload
    .map(normalizeCompetitor)
    .filter((item) => item.slug && item.name)
    .slice(0, entitlement.isUnlimited ? undefined : maxWatchedCompetitors);

  const { data: existingRows, error: existingErr } = await supabase
    .from("saved_competitors")
    .select("slug, logo_url, brand_logo_url")
    .eq("user_id", user.id);

  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 500 });
  }

  const existingBySlug = new Map(
    (existingRows ?? []).map((r) => {
      const s = normalizeCompetitorSlug(String(r.slug ?? ""));
      return [s, { logo_url: r.logo_url as string | null, brand_logo_url: r.brand_logo_url as string | null }] as const;
    })
  );

  const rows = items.map((item) => {
    const slug = normalizeCompetitorSlug(item.slug);
    const prior = existingBySlug.get(slug);
    const logo_url = item.logoUrl?.trim() ? item.logoUrl.trim() : prior?.logo_url ?? null;
    const brand_logo_url = item.brand?.logoUrl?.trim()
      ? item.brand.logoUrl.trim()
      : prior?.brand_logo_url ?? null;
    return {
      user_id: user.id,
      slug,
      name: item.name,
      logo_url,
      brand_name: item.brand?.name ?? null,
      brand_domain: item.brand?.domain ?? null,
      brand_logo_url,
      pending: item.pending ?? false,
      updated_at: new Date().toISOString(),
    };
  });

  const existingSlugs = new Set(
    (existingRows ?? []).map((r) => normalizeCompetitorSlug(String(r.slug ?? ""))).filter(Boolean)
  );
  for (const row of rows) {
    existingSlugs.add(row.slug);
  }

  if (!entitlement.isUnlimited && existingSlugs.size > maxWatchedCompetitors) {
    return NextResponse.json(
      {
        error: `You can watch at most ${maxWatchedCompetitors} competitors. Remove one to add another.`,
      },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("saved_competitors").upsert(rows, {
    onConflict: "user_id,slug",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { slug?: unknown; cacheDomain?: unknown };
  try {
    body = (await request.json()) as { slug?: unknown; cacheDomain?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.slug !== "string" || !body.slug.trim()) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const slug = normalizeCompetitorSlug(body.slug);
  let cacheDomain = slug;

  const { data: existing } = await supabase
    .from("saved_competitors")
    .select("slug, brand_domain")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .maybeSingle();

  if (existing?.brand_domain?.trim()) {
    cacheDomain = normalizeCompetitorSlug(existing.brand_domain);
  } else if (existing?.slug?.trim()) {
    cacheDomain = normalizeCompetitorSlug(existing.slug);
  } else if (typeof body.cacheDomain === "string" && body.cacheDomain.trim()) {
    cacheDomain = normalizeCompetitorSlug(body.cacheDomain);
  }

  const { error: delSavedError } = await supabase
    .from("saved_competitors")
    .delete()
    .eq("user_id", user.id)
    .eq("slug", slug);

  if (delSavedError) {
    return NextResponse.json({ error: delSavedError.message }, { status: 500 });
  }

  const [adsRes, stratRes] = await Promise.all([
    supabase.from("ads_cache").delete().eq("user_id", user.id).eq("competitor_domain", cacheDomain),
    supabase
      .from("strategy_overview_cache")
      .delete()
      .eq("user_id", user.id)
      .eq("competitor_domain", cacheDomain),
  ]);

  const warnings: string[] = [];
  if (adsRes.error) warnings.push(adsRes.error.message);
  if (stratRes.error) warnings.push(stratRes.error.message);

  return NextResponse.json({
    ok: true,
    hadSavedRow: Boolean(existing),
    cacheDomainPurged: cacheDomain,
    ...(warnings.length > 0 ? { warnings } : {}),
  });
}
