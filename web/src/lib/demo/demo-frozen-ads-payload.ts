import type { TimelineAd } from "@/components/competitor/tests-timeline/timeline-types";

import type { DemoAd, DemoCreativeTest, DemoPlatform } from "@/lib/demo/dashboard-demo-data";
import {
  FROZEN_AD_BY_ID,
  FROZEN_ADS_BRAND_NAME,
  FROZEN_LIBRARY_AD_IDS,
  type FrozenScrapedAd,
} from "@/lib/demo/frozen/frozen-adidas-com-ads";
import {
  buildPresentedFrozenCreativeTests,
  buildPresentedFrozenTimelineAds,
  buildPresentedFrozenTimelineDateRange,
  buildFrozenCopyVaultAds,
} from "@/lib/demo/demo-frozen-adidas-presentation";
import { getFrozenNikeCreativeUrl } from "@/lib/demo/demo-frozen-nike-ads-payload";

const DAY_MS = 24 * 60 * 60 * 1000;

const PLATFORM_GRADIENTS: Record<DemoPlatform, string> = {
  meta: "linear-gradient(135deg, #1e3a5f 0%, #4a7fa5 55%, #7eb3d4 100%)",
  google: "linear-gradient(135deg, #0f172a 0%, #1e40af 45%, #3b82f6 100%)",
  tiktok: "linear-gradient(160deg, #0f172a 0%, #334155 45%, #64748b 100%)",
  linkedin: "linear-gradient(135deg, #0a2540 0%, #0a66c2 55%, #70b5f9 100%)",
  pinterest: "linear-gradient(120deg, #7f1d1d 0%, #e60023 50%, #f97316 100%)",
  snapchat: "linear-gradient(135deg, #fef08a 0%, #facc15 45%, #0fad00 100%)",
};

function demoPlatformFromString(platform: string): DemoPlatform {
  const p = platform.trim().toLowerCase();
  if (p === "youtube") return "google";
  if (p === "meta" || p === "google" || p === "tiktok" || p === "linkedin" || p === "pinterest" || p === "snapchat") {
    return p;
  }
  return "meta";
}

function parseHeadline(adText: string): { headline: string; body: string } {
  const lines = adText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const deduped: string[] = [];
  for (const line of lines) {
    if (deduped.some((d) => d === line || (line.length > 20 && d.startsWith(line.slice(0, 20))))) continue;
    deduped.push(line);
  }
  const joined = deduped.join("\n").trim() || adText.trim();
  const cap = 220;
  const body = joined.length > cap ? `${joined.slice(0, cap - 1).trimEnd()}…` : joined;
  const first = deduped[0] ?? body;
  const headline = first.length > 80 ? `${first.slice(0, 77)}…` : first;
  return { headline, body };
}

export function frozenAdToDemoAd(ad: FrozenScrapedAd, domain: string, brandName = FROZEN_ADS_BRAND_NAME): DemoAd {
  const platform = demoPlatformFromString(ad.platform);
  const { headline, body } = parseHeadline(ad.ad_text);
  const firstMs = Date.parse(ad.first_seen_at);
  const lastMs = Date.parse(ad.last_seen_at);
  const activeDays =
    Number.isFinite(firstMs) && Number.isFinite(lastMs)
      ? Math.max(1, Math.floor((lastMs - firstMs) / DAY_MS))
      : 14;
  const formatLower = ad.format.toLowerCase();
  const isVideo = formatLower.includes("video") || formatLower === "reels" || formatLower === "story";

  return {
    id: ad.id,
    platform,
    pageName: brandName,
    body,
    headline,
    linkDescription: domain.replace(/^www\./, ""),
    cta: platform === "google" ? "Visit site" : "Shop Now",
    siteLabel: domain,
    activeDays,
    isVideo,
    gradient: PLATFORM_GRADIENTS[platform],
    format: ad.format,
    lifespanDays: activeDays,
    angle: ad.ai_extracted_angle ?? undefined,
    creativeUrl: ad.frozen_creative_url,
  };
}

const DEMO_ADIDAS_EXTRA_LIBRARY_ADS: Record<string, FrozenScrapedAd> = {
  "f3c8a912-4b6e-4d9a-9f12-8e4d6a2b1c03": {
    id: "f3c8a912-4b6e-4d9a-9f12-8e4d6a2b1c03",
    platform: "pinterest",
    format: "image",
    ad_text:
      "Predator Elite FT Fußballschuhe\nDer Predator Elite FT wurde für Spieler entwickelt, die das Spiel dominieren wollen. Mit HybridTouch-Oberfläche und Controlframe-Technologie für maximalen Ballkontakt auf dem Platz.",
    ai_extracted_angle:
      "quality · Hook: Predator Elite FT Fußballschuhe · Body: Performance football boot with ball-control tech",
    first_seen_at: "2026-05-18T22:00:00+00:00",
    last_seen_at: "2026-06-27T22:00:00+00:00",
    is_active: true,
    frozen_creative_url: "/demo/frozen/adidas.com/ads/27d45bb6-9573-40be-83fd-7109b7cb754b.jpg",
  },
};

const DEMO_ADIDAS_EXTRA_LIBRARY_IDS = Object.keys(DEMO_ADIDAS_EXTRA_LIBRARY_ADS);

function resolveFrozenLibraryAd(id: string): FrozenScrapedAd {
  const ad = FROZEN_AD_BY_ID[id] ?? DEMO_ADIDAS_EXTRA_LIBRARY_ADS[id];
  if (!ad) throw new Error(`Missing frozen ad: ${id}`);
  return ad;
}

export function buildFrozenDemoAds(domain = "competitor-a.com"): DemoAd[] {
  return [...FROZEN_LIBRARY_AD_IDS, ...DEMO_ADIDAS_EXTRA_LIBRARY_IDS].map((id) =>
    frozenAdToDemoAd(resolveFrozenLibraryAd(id), domain),
  );
}

export function buildFrozenTimelineAds(): TimelineAd[] {
  return buildPresentedFrozenTimelineAds();
}

export function buildFrozenTimelineDateRange(): { earliest: string; latest: string } {
  return buildPresentedFrozenTimelineDateRange();
}

export function buildFrozenCreativeTests(): DemoCreativeTest[] {
  return buildPresentedFrozenCreativeTests();
}

export { buildFrozenCopyVaultAds };

export function getFrozenDemoCreativeUrl(adId: string): string | null {
  return (
    FROZEN_AD_BY_ID[adId]?.frozen_creative_url ??
    DEMO_ADIDAS_EXTRA_LIBRARY_ADS[adId]?.frozen_creative_url ??
    getFrozenNikeCreativeUrl(adId)
  );
}
