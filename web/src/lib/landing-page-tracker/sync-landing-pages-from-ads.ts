import { extractGoogleHostnameLandingKey, extractLandingPageUrl } from "@/lib/landing-pages/extract-lp-url";
import {
  hostFromLandingPageUrl,
  landingPageGroupKey,
  normalizeLandingPageUrl,
} from "@/lib/landing-pages/normalize-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/types";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

type AdRow = {
  platform: string;
  raw_payload: Json;
};

function competitorRootHost(competitorWebsite: string): string | null {
  return hostFromLandingPageUrl(competitorWebsite);
}

function homepageGroupKey(competitorWebsite: string): string | null {
  const normalized = normalizeLandingPageUrl(competitorWebsite);
  if (!normalized) return null;
  return landingPageGroupKey(normalized);
}

/** Derive a human label from URL path, e.g. /pricing → "Pricing". */
export function labelFromLandingPageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return "Homepage";
    const last = segments[segments.length - 1] ?? "";
    const cleaned = last.replace(/[-_]+/g, " ").replace(/\.(html?|php|aspx?)$/i, "");
    if (!cleaned) return "Ad Landing Page";
    return cleaned
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  } catch {
    return "Ad Landing Page";
  }
}

function extractUrlFromAd(ad: AdRow): string | null {
  const lpUrl = extractLandingPageUrl(ad.platform, ad.raw_payload);
  if (lpUrl) return lpUrl;
  return extractGoogleHostnameLandingKey(ad.platform, ad.raw_payload);
}

export async function syncLandingPagesFromAds(
  admin: AdminClient,
  competitorId: string,
  userId: string,
  competitorWebsite: string,
  ads: AdRow[],
): Promise<void> {
  const rootHost = competitorRootHost(competitorWebsite);
  const homeKey = homepageGroupKey(competitorWebsite);
  if (!rootHost) return;

  const { data: existingPages } = await admin
    .from("landing_pages")
    .select("url")
    .eq("competitor_id", competitorId)
    .eq("user_id", userId);

  const existingUrls = new Set(
    (existingPages ?? [])
      .map((p) => landingPageGroupKey(p.url))
      .filter((k): k is string => Boolean(k)),
  );

  const seen = new Set<string>();
  const now = new Date().toISOString();

  for (const ad of ads) {
    const rawUrl = extractUrlFromAd(ad);
    if (!rawUrl) continue;

    const groupKey = landingPageGroupKey(rawUrl);
    if (!groupKey || seen.has(groupKey)) continue;
    seen.add(groupKey);

    if (homeKey && groupKey === homeKey) continue;

    const adHost = hostFromLandingPageUrl(groupKey);
    if (!adHost || adHost !== rootHost) continue;

    const isNew = !existingUrls.has(groupKey);
    const row: Database["public"]["Tables"]["landing_pages"]["Insert"] = {
      competitor_id: competitorId,
      user_id: userId,
      url: groupKey,
      label: labelFromLandingPageUrl(groupKey),
      page_type: "custom",
      auto_detected_from: "ads",
      is_active: true,
      ...(isNew ? { next_screenshot_at: now } : {}),
    };

    await admin.from("landing_pages").upsert(row, { onConflict: "competitor_id,url" });
  }
}

/** Load active ads for a competitor and sync landing pages. */
export async function syncLandingPagesFromCompetitorAds(
  admin: AdminClient,
  competitorId: string,
  userId: string,
  competitorWebsite: string,
): Promise<void> {
  const { data: ads } = await admin
    .from("scraped_ads")
    .select("platform, raw_payload")
    .eq("competitor_id", competitorId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(2000);

  if (!ads?.length) return;

  await syncLandingPagesFromAds(admin, competitorId, userId, competitorWebsite, ads);
}
