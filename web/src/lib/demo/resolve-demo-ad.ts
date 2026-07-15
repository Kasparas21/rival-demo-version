import type { TimelineAd } from "@/components/competitor/tests-timeline/timeline-types";

import type { DemoAd, DemoCreativeTestAd, DemoPlatform } from "@/lib/demo/dashboard-demo-data";
import { getFrozenDemoCreativeUrl } from "@/lib/demo/demo-frozen-ads-payload";
import {
  getDemoBrandPayload,
  listDemoBrandPayloads,
  type DemoBrandPayload,
} from "@/lib/demo/demo-brand-payload";

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

function parseHeadlineFromText(text: string): { headline: string; body: string } {
  const dash = text.indexOf(" — ");
  if (dash >= 0) {
    return { headline: text.slice(0, dash).trim(), body: text.trim() };
  }
  if (text.length > 72) {
    return { headline: `${text.slice(0, 69)}…`, body: text };
  }
  return { headline: text, body: text };
}

function synthesizeDemoAd(
  payload: DemoBrandPayload,
  {
    id,
    platform,
    text,
    format,
    firstSeen,
    lastSeen,
  }: {
    id: string;
    platform: string;
    text: string;
    format: string;
    firstSeen: string;
    lastSeen: string;
  },
): DemoAd {
  const demoPlatform = demoPlatformFromString(platform);
  const { headline, body } = parseHeadlineFromText(text);
  const firstMs = Date.parse(firstSeen);
  const lastMs = Date.parse(lastSeen);
  const lifespanDays = Number.isFinite(firstMs) && Number.isFinite(lastMs)
    ? Math.max(1, Math.floor((lastMs - firstMs) / DAY_MS))
    : 14;
  const formatLower = format.toLowerCase();
  const isVideo = formatLower.includes("video") || formatLower === "reels" || formatLower === "story";

  return {
    id,
    platform: demoPlatform,
    pageName: payload.name,
    body,
    headline,
    linkDescription: "Learn more",
    cta: demoPlatform === "google" ? "Visit site" : payload.key === "own" ? "Sign Up" : "Shop Now",
    siteLabel: payload.domain,
    activeDays: lifespanDays,
    isVideo,
    gradient: PLATFORM_GRADIENTS[demoPlatform],
    format,
    lifespanDays,
    creativeUrl: undefined as string | undefined,
  };
}

function withFrozenCreative(ad: DemoAd, id: string, creativeUrl?: string | null): DemoAd {
  const url = creativeUrl?.trim() || getFrozenDemoCreativeUrl(id);
  return url ? { ...ad, creativeUrl: url } : ad;
}

function fromCreativeTestAd(payload: DemoBrandPayload, ad: DemoCreativeTestAd): DemoAd {
  const base = synthesizeDemoAd(payload, {
    id: ad.id,
    platform: ad.platform,
    text: ad.ad_text,
    format: ad.format,
    firstSeen: ad.first_seen_at,
    lastSeen: ad.last_seen_at,
  });
  return withFrozenCreative(base, ad.id, ad.ad_creative_url ?? ad.archived_creative_url);
}

function fromTimelineAd(payload: DemoBrandPayload, ad: TimelineAd): DemoAd {
  const linked = payload.ads.find((row) => row.id === ad.id);
  if (linked) return linked;
  const base = synthesizeDemoAd(payload, {
    id: ad.id,
    platform: ad.platform,
    text: ad.ad_text,
    format: ad.format,
    firstSeen: ad.first_seen_at,
    lastSeen: ad.last_seen_at,
  });
  return withFrozenCreative(base, ad.id, ad.ad_creative_url ?? ad.archived_creative_url);
}

function resolveInPayload(payload: DemoBrandPayload, adId: string): DemoAd | null {
  const direct = payload.ads.find((ad) => ad.id === adId);
  if (direct) return direct;

  const timeline = payload.timelineAds.find((ad) => ad.id === adId);
  if (timeline) return fromTimelineAd(payload, timeline);

  for (const test of payload.creativeTests) {
    const creativeTestAd = test.ads.find((ad) => ad.id === adId);
    if (creativeTestAd) return fromCreativeTestAd(payload, creativeTestAd);
  }

  return null;
}

export function resolveDemoAdById(adId: string, domain?: string): DemoAd | null {
  if (domain) {
    return resolveInPayload(getDemoBrandPayload(domain), adId);
  }

  for (const payload of listDemoBrandPayloads()) {
    const ad = resolveInPayload(payload, adId);
    if (ad) return ad;
  }

  return null;
}
