import { NextResponse } from "next/server";
import { ensureUserProfile } from "@/lib/auth/profile";
import type { SavedCompetitorPayload } from "@/lib/account/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    .limit(36);

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

  const rows = payload
    .map(normalizeCompetitor)
    .filter((item) => item.slug && item.name)
    .slice(0, 36)
    .map((item) => ({
      user_id: user.id,
      slug: item.slug,
      name: item.name,
      logo_url: item.logoUrl ?? null,
      brand_name: item.brand?.name ?? null,
      brand_domain: item.brand?.domain ?? null,
      brand_logo_url: item.brand?.logoUrl ?? null,
      pending: item.pending ?? false,
      updated_at: new Date().toISOString(),
    }));

  const { error } = await supabase.from("saved_competitors").upsert(rows, {
    onConflict: "user_id,slug",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
