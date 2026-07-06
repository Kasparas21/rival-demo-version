import type { ChannelId } from "@/components/channel-picker-modal";
import type { PlatformIdentifier } from "@/components/manual-identifiers-form";
import {
  buildMetaAdLibraryUrl,
  canonicalLinkedInAdLibraryUrl,
  canonicalMetaAdsLibraryUrl,
  extractMetaAdsLibraryPageId,
} from "@/lib/ad-library/canonical-library-url";
import { canonicalGoogleAdsTransparencyStartUrl } from "@/lib/ad-library/google-transparency-url";
import {
  buildGoogleTransparencyPreviewUrl,
  buildLinkedInAdLibraryPreviewUrl,
  buildMetaAdsLibraryPreviewUrl,
  buildPinterestAdsPreviewUrl,
  buildSnapchatAdsGalleryPreviewUrl,
  buildTikTokAdsLibraryPreviewUrl,
} from "@/lib/onboarding/ad-library-preview-urls";

export type PlatformConnectionFieldSpec = {
  label: string;
  hint?: string;
  placeholder?: string;
};

/** Shared per-platform connection copy (workspace + competitor settings). */
export const PLATFORM_CONNECTION_FIELD_SPECS: Record<ChannelId, PlatformConnectionFieldSpec> = {
  meta: {
    label: "Meta Ads Library URL",
    hint: "Use an Ad Library search URL—not a Facebook Page link.",
    placeholder: "https://www.facebook.com/ads/library/...",
  },
  google: {
    label: "URL with Advertiser ID",
    hint: "URL from Google Ads Transparency Center that includes …/advertiser/AR… in the path.",
    placeholder: "https://adstransparency.google.com/advertiser/AR…",
  },
  linkedin: {
    label: "LinkedIn Ad Library URL",
    hint: "Ad Library search or company/advertiser link.",
    placeholder: "https://www.linkedin.com/ad-library/search?...",
  },
  tiktok: {
    label: "TikTok keyword",
    hint: "What we pass to TikTok Ads Library search.",
    placeholder: "Exact advertiser name from TikTok Ads Library",
  },
  pinterest: {
    label: "Pinterest search keyword",
    hint: "Keyword-style match in Pinterest transparency.",
    placeholder: "e.g. brand handle or advertiser name",
  },
  snapchat: {
    label: "Snapchat keyword",
    hint: "Gallery search term for this advertiser.",
    placeholder: "Exact gallery advertiser name",
  },
};

function normalizeUrl(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (!/^https?:\/\//i.test(v)) return `https://${v}`;
  return v.replace(/\/+$/, "");
}

export function mergeMetaFromInput(raw: string): Pick<PlatformIdentifier, "meta" | "metaPageUrl"> {
  const t = raw.trim();
  if (!t) return { meta: undefined, metaPageUrl: undefined };

  const canon = canonicalMetaAdsLibraryUrl(t);
  if (canon) {
    return {
      meta: extractMetaAdsLibraryPageId(canon),
      metaPageUrl: canon,
    };
  }

  const low = t.toLowerCase();
  const adLib =
    low.includes("facebook.com/ads/library") ||
    low.includes("fb.com/ads/library") ||
    low.includes("m.facebook.com/ads/library");
  if (adLib) {
    const normalized = normalizeUrl(t);
    return { meta: undefined, metaPageUrl: normalized };
  }
  if (low.includes("facebook.com") || low.includes("fb.com") || low.includes("fb.me")) {
    return { meta: undefined, metaPageUrl: normalizeUrl(t) };
  }
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 22 && /^[\d\s-]+$/.test(t.replace(/[^\d\s-]/g, ""))) {
    return { meta: digits, metaPageUrl: buildMetaAdLibraryUrl(digits) };
  }
  return { meta: undefined, metaPageUrl: undefined };
}

export function metaDisplayFromIds(ids: Record<string, string>): string {
  return ids.metaPageUrl?.trim() || ids.meta?.trim() || "";
}

export function identifiersFromIds(ids: Record<string, string>): PlatformIdentifier {
  const stripAt = (v: string | undefined) => (typeof v === "string" ? v.replace(/^@+/, "").trim() : "");
  return {
    google: ids.google?.trim() || undefined,
    linkedin: ids.linkedin?.trim() || undefined,
    tiktok: stripAt(ids.tiktok) || undefined,
    pinterest: ids.pinterest?.trim() || undefined,
    pinterestAdvertiserName: ids.pinterestAdvertiserName?.trim() || stripAt(ids.pinterest) || undefined,
    snapchat: stripAt(ids.snapchat) || undefined,
  };
}

export function buildPlatformIdsFromForm(params: {
  channels: ChannelId[];
  metaDisplay: string;
  identifiers: PlatformIdentifier;
}): Record<string, string> {
  const { channels, metaDisplay, identifiers } = params;
  const out: Record<string, string> = {};
  const put = (k: string, v: string | undefined) => {
    const t = typeof v === "string" ? v.trim() : "";
    if (t) out[k] = t;
  };

  if (channels.includes("meta")) {
    const metaPart = mergeMetaFromInput(metaDisplay);
    put("meta", metaPart.meta);
    put("metaPageUrl", metaPart.metaPageUrl);
  }
  if (channels.includes("google")) {
    const g = identifiers.google?.trim() ?? "";
    const canon = g ? canonicalGoogleAdsTransparencyStartUrl(g) : null;
    put("google", canon ?? g);
  }
  if (channels.includes("linkedin")) {
    const li = identifiers.linkedin?.trim() ?? "";
    const canon = li ? canonicalLinkedInAdLibraryUrl(li) : null;
    put("linkedin", canon ?? li);
  }
  if (channels.includes("tiktok")) {
    const kw = identifiers.tiktok?.trim() ?? "";
    if (kw) put("tiktok", kw.startsWith("@") ? kw : `@${kw.replace(/^@+/, "")}`);
  }
  if (channels.includes("pinterest")) {
    const pin =
      identifiers.pinterestAdvertiserName?.trim() || identifiers.pinterest?.trim() || "";
    if (pin) {
      put("pinterestAdvertiserName", pin);
      put("pinterest", pin);
    }
  }
  if (channels.includes("snapchat")) {
    const snap = identifiers.snapchat?.trim() ?? "";
    if (snap) put("snapchat", snap.startsWith("@") ? snap : `@${snap.replace(/^@+/, "")}`);
  }

  return out;
}

export function competitorPreviewHrefForChannel(
  id: ChannelId,
  metaDisplay: string,
  identifiers: PlatformIdentifier,
): string {
  switch (id) {
    case "meta":
      return buildMetaAdsLibraryPreviewUrl(metaDisplay);
    case "google":
      return buildGoogleTransparencyPreviewUrl(identifiers.google?.trim() ?? "");
    case "linkedin":
      return buildLinkedInAdLibraryPreviewUrl(identifiers.linkedin?.trim() ?? "");
    case "tiktok":
      return buildTikTokAdsLibraryPreviewUrl(identifiers.tiktok?.trim() ?? "");
    case "pinterest":
      return buildPinterestAdsPreviewUrl(
        identifiers.pinterestAdvertiserName?.trim() || identifiers.pinterest?.trim() || "",
      );
    case "snapchat":
      return buildSnapchatAdsGalleryPreviewUrl(identifiers.snapchat?.trim() ?? "");
    default:
      return "about:blank";
  }
}

export function fieldValueForChannel(
  id: ChannelId,
  metaDisplay: string,
  identifiers: PlatformIdentifier,
): string {
  if (id === "meta") return metaDisplay;
  if (id === "pinterest") {
    return identifiers.pinterestAdvertiserName?.trim() || identifiers.pinterest?.trim() || "";
  }
  return String(identifiers[id as keyof PlatformIdentifier] ?? "").trim();
}
