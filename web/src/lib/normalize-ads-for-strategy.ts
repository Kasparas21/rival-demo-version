import type { AdsLibraryResponse } from "@/lib/ad-library/api-types";
import { coerceAdsLibraryResponse } from "@/lib/ad-library/api-types";
import type { NormalizedAdForStrategy } from "@/lib/strategy-overview-types";

function normalizeFormat(raw: string | undefined, fallback: string): string {
  if (!raw?.trim()) return fallback;
  const t = raw.trim().toLowerCase();
  if (t === "video" || t === "image" || t === "text" || t === "carousel") return t;
  return t;
}

export type { NormalizedAdForStrategy };

export function normalizeAdsForStrategy(adLib: AdsLibraryResponse | null): NormalizedAdForStrategy[] {
  if (!adLib) return [];
  const lib = coerceAdsLibraryResponse(adLib);
  const ads: NormalizedAdForStrategy[] = [];

  for (const ad of lib.meta.ads ?? []) {
    const bodyMerged = [ad.desc, ad.linkDescription].filter((s) => typeof s === "string" && s.trim()).join("\n\n");
    ads.push({
      platform: "meta",
      headline: ad.headline ?? "",
      body: bodyMerged.trim() || (ad.desc ?? ""),
      cta: ad.cta ?? "",
      format: ad.isVideo ? "video" : "image",
      firstSeen: ad.startedAt != null ? String(ad.startedAt) : undefined,
    });
  }

  for (const row of lib.google.rows ?? []) {
    if (row.type === "google") {
      ads.push({
        platform: "google",
        headline: row.title ?? "",
        body: (row.creativeCopy ?? row.desc ?? "").trim() || "",
        cta: "",
        format: normalizeFormat(row.format, "text"),
        firstSeen: row.lastShownLabel ?? undefined,
      });
    } else {
      ads.push({
        platform: "youtube",
        headline: row.title ?? "",
        body: [row.channel, row.views].filter(Boolean).join(" · ") || "",
        cta: "",
        format: "video",
        firstSeen: undefined,
      });
    }
  }

  for (const ad of lib.linkedin.ads ?? []) {
    ads.push({
      platform: "linkedin",
      headline: ad.headline ?? "",
      body: ad.desc ?? "",
      cta: "",
      format: ad.videoUrl ? "video" : "image",
      firstSeen: undefined,
    });
  }

  for (const ad of lib.tiktok.ads ?? []) {
    ads.push({
      platform: "tiktok",
      headline: ad.headline ?? "",
      body: ad.desc ?? "",
      cta: "",
      format: "video",
      firstSeen: ad.firstShown ?? ad.lastShown ?? undefined,
    });
  }

  for (const ad of lib.microsoft.ads ?? []) {
    ads.push({
      platform: "microsoft",
      headline: ad.headline ?? "",
      body: ad.desc ?? "",
      cta: "",
      format: "text",
      firstSeen: undefined,
    });
  }

  for (const ad of lib.pinterest.ads ?? []) {
    ads.push({
      platform: "pinterest",
      headline: ad.headline ?? "",
      body: ad.desc ?? "",
      cta: "",
      format: ad.videoUrl ? "video" : "image",
      firstSeen: undefined,
    });
  }

  for (const ad of lib.snapchat.ads ?? []) {
    ads.push({
      platform: "snapchat",
      headline: ad.headline ?? "",
      body: ad.desc ?? "",
      cta: "",
      format: ad.videoUrl ? "video" : "image",
      firstSeen: undefined,
    });
  }

  return ads;
}
