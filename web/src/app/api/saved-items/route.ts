import { NextResponse } from "next/server";

import { denyIfWorkspaceBrandSavedAdsBlocked } from "@/lib/saved-ads/workspace-brand-saved-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const competitorId = (searchParams.get("competitorId") ?? "").trim();
  const summaryOnly = searchParams.get("summary") === "1";
  if (!competitorId) {
    return NextResponse.json({ ok: false, error: "missing competitorId" }, { status: 400 });
  }

  const adsBlocked = await denyIfWorkspaceBrandSavedAdsBlocked(supabase, user.id, competitorId);
  const adsBlockedResponse = adsBlocked !== null;

  const capabilities = {
    ads: !adsBlockedResponse,
    emails: true,
    organic: true,
    landings: true,
  };

  if (summaryOnly) {
    const [adsCountRes, emailsCountRes, organicCountRes, landingsCountRes] = await Promise.all([
      adsBlockedResponse
        ? Promise.resolve({ count: 0, error: null })
        : supabase
            .from("saved_ads")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("competitor_id", competitorId),
      supabase
        .from("saved_emails")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("competitor_id", competitorId),
      supabase
        .from("saved_organic_posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("competitor_id", competitorId),
      supabase
        .from("saved_landing_pages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("competitor_id", competitorId),
    ]);

    const firstError =
      adsCountRes.error ?? emailsCountRes.error ?? organicCountRes.error ?? landingsCountRes.error;
    if (firstError) {
      return NextResponse.json({ ok: false, error: firstError.message }, { status: 500 });
    }

    const ads = adsCountRes.count ?? 0;
    const emails = emailsCountRes.count ?? 0;
    const organic = organicCountRes.count ?? 0;
    const landings = landingsCountRes.count ?? 0;
    return NextResponse.json({
      ok: true,
      counts: { ads, emails, organic, landings, total: ads + emails + organic + landings },
      capabilities,
    });
  }

  const [adsRes, emailsRes, organicRes, landingsRes] = await Promise.all([
    adsBlockedResponse
      ? Promise.resolve({ data: [] as never[], error: null })
      : supabase
          .from("saved_ads")
          .select(
            "id, source_scraped_ad_id, platform, ad_text, ad_creative_url, format, ai_extracted_angle, notes, saved_at, raw_payload",
          )
          .eq("user_id", user.id)
          .eq("competitor_id", competitorId)
          .order("saved_at", { ascending: false }),
    supabase
      .from("saved_emails")
      .select(
        "id, source_competitor_email_id, from_email, from_name, subject, preview_text, email_type, ai_summary, received_at, saved_at",
      )
      .eq("user_id", user.id)
      .eq("competitor_id", competitorId)
      .order("saved_at", { ascending: false }),
    supabase
      .from("saved_organic_posts")
      .select(
        "id, source_organic_post_id, platform, post_id, content, media_urls, likes, comments, shares, views, posted_at, post_url, product_type, author_username, author_display_name, author_avatar_url, saved_at",
      )
      .eq("user_id", user.id)
      .eq("competitor_id", competitorId)
      .order("saved_at", { ascending: false }),
    supabase
      .from("saved_landing_pages")
      .select(
        "id, source_landing_page_id, url, label, page_type, screenshot_url, hero_screenshot_url, saved_at",
      )
      .eq("user_id", user.id)
      .eq("competitor_id", competitorId)
      .order("saved_at", { ascending: false }),
  ]);

  const firstError = adsRes.error ?? emailsRes.error ?? organicRes.error ?? landingsRes.error;
  if (firstError) {
    return NextResponse.json({ ok: false, error: firstError.message }, { status: 500 });
  }

  const savedAds = adsRes.data ?? [];
  const savedEmails = emailsRes.data ?? [];
  const savedOrganicPosts = organicRes.data ?? [];
  const savedLandingPages = landingsRes.data ?? [];

  return NextResponse.json({
    ok: true,
    savedAds,
    savedEmails,
    savedOrganicPosts,
    savedLandingPages,
    counts: {
      ads: savedAds.length,
      emails: savedEmails.length,
      organic: savedOrganicPosts.length,
      landings: savedLandingPages.length,
      total:
        savedAds.length + savedEmails.length + savedOrganicPosts.length + savedLandingPages.length,
    },
    capabilities,
  });
}
