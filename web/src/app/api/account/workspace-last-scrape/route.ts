import { NextResponse, type NextRequest } from "next/server";
import { normalizeCompetitorSlug } from "@/lib/sidebar-competitors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Primary brand Ads Library scrape time — sidebar API omits workspace rows. Optional `brandId` = active dashboard brand. */
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ lastScrapedAt: null }, { status: 401 });
  }

  const brandId = req.nextUrl.searchParams.get("brandId")?.trim();
  let primary:
    | {
        domain: string | null;
      }
    | null = null;

  if (brandId && brandId !== "default") {
    const scoped = await supabase
      .from("brands")
      .select("domain")
      .eq("user_id", user.id)
      .eq("id", brandId)
      .maybeSingle();
    if (scoped.error) {
      return NextResponse.json({ error: scoped.error.message }, { status: 500 });
    }
    primary = scoped.data ?? null;
  }

  if (!primary?.domain?.trim()) {
    const fb = await supabase
      .from("brands")
      .select("domain")
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (fb.error) {
      return NextResponse.json({ error: fb.error.message }, { status: 500 });
    }
    primary = fb.data ?? null;
  }

  const workspaceDomainGuess =
    primary?.domain
      ?.trim()
      .toLowerCase()
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0] ?? "";

  let lastStr: string | null = null;

  if (workspaceDomainGuess) {
    const domainQuery = await supabase
      .from("saved_competitors")
      .select("last_scraped_at")
      .eq("user_id", user.id)
      .eq("brand_domain", workspaceDomainGuess)
      .order("last_scraped_at", { ascending: false, nullsFirst: false })
      .limit(1);
    if (domainQuery.error) {
      return NextResponse.json({ error: domainQuery.error.message }, { status: 500 });
    }
    if (domainQuery.data?.[0]?.last_scraped_at) {
      lastStr = domainQuery.data[0].last_scraped_at;
    }
    if (!lastStr) {
      const slug = normalizeCompetitorSlug(workspaceDomainGuess).toLowerCase();
      const slugQuery = await supabase
        .from("saved_competitors")
        .select("last_scraped_at")
        .eq("user_id", user.id)
        .eq("slug", slug)
        .order("last_scraped_at", { ascending: false, nullsFirst: false })
        .limit(1);
      if (slugQuery.error) {
        return NextResponse.json({ error: slugQuery.error.message }, { status: 500 });
      }
      if (slugQuery.data?.[0]?.last_scraped_at) {
        lastStr = slugQuery.data[0].last_scraped_at;
      }
    }
  }

  return NextResponse.json({
    lastScrapedAt: lastStr ? String(lastStr) : null,
  });
}
