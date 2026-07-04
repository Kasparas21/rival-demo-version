import type { ChannelId } from "@/components/channel-picker-modal";
import {
  canonicalLinkedInAdLibraryUrl,
  canonicalMetaAdsLibraryUrl,
  extractMetaAdsLibraryPageId,
} from "@/lib/ad-library/canonical-library-url";
import { canonicalGoogleAdsTransparencyStartUrl } from "@/lib/ad-library/google-transparency-url";
import { extractDomain, normalizeDiscoveredIds, parseSocialLinks } from "@/lib/discovery";
import { socialNetworkBucket } from "@/lib/onboarding/social-profile-utils";

/** Same scrape fields as onboarding workspace flow (homepage + ad libraries). */
export type WorkspaceAdsScrapeHints = {
  websiteUrl: string;
  /** Must be Meta Ads Library URL (or numeric page id) — not a plain Facebook page */
  metaAdsLibraryUrl: string;
  /** Google Ads Transparency Center advertiser (or creative) URL — preferred over legacy domain search */
  googleAdsTransparencyUrl: string;
  /** Legacy: domain passed to Google Transparency search terms */
  googleAdsDomain: string;
  linkedInUrl: string;
  /** TikTok Ads Library keyword / handle (bare or @) */
  tiktokKeyword: string;
  pinterestKeyword: string;
  snapchatKeyword: string;
  /** Hydrated from older saves / rival-shaped merges */
  facebookUrl: string;
  instagramUrl: string;
  tikTokUrl: string;
  youTubeUrl: string;
};

/** Persisted on `brands.ads_profile_setup` for workspace Ads Library / comparison evidence. */
export type AdsProfileSetup = {
  channels: ChannelId[];
  adMarketCountryCodes: string[];
  scrape: WorkspaceAdsScrapeHints;
};

export const ADS_PROFILE_SETUP_VERSION = 1 as const;

function firstHrefForBucket(socials: Array<{ href: string }>, bucket: string): string {
  for (const s of socials) {
    if (socialNetworkBucket(s.href) === bucket) return s.href;
  }
  return "";
}

export function emptyWorkspaceScrapeRow(domain: string): WorkspaceAdsScrapeHints {
  const h = domain.replace(/^www\./i, "").trim();
  return {
    websiteUrl: h ? `https://${h}` : "",
    metaAdsLibraryUrl: "",
    googleAdsTransparencyUrl: "",
    googleAdsDomain: "",
    linkedInUrl: "",
    tiktokKeyword: "",
    pinterestKeyword: "",
    snapchatKeyword: "",
    facebookUrl: "",
    instagramUrl: "",
    tikTokUrl: "",
    youTubeUrl: "",
  };
}

/** Merge homepage social links into workspace scrape hints (prefill only when target field is empty). */
export function mergeWorkspaceScrapeFromSocials(
  workspaceDomain: string,
  row: WorkspaceAdsScrapeHints,
  socials: Array<{ href: string }>,
): WorkspaceAdsScrapeHints {
  const out = { ...row };
  if (!out.websiteUrl.trim()) out.websiteUrl = `https://${workspaceDomain}`;

  const fb = firstHrefForBucket(socials, "facebook");
  const ig = firstHrefForBucket(socials, "instagram");
  if (!out.facebookUrl.trim()) out.facebookUrl = fb;
  if (!out.instagramUrl.trim()) out.instagramUrl = ig;

  if (!out.youTubeUrl.trim()) out.youTubeUrl = firstHrefForBucket(socials, "youtube");

  /** TikTok / Pinterest / Snapchat advertiser names are never prefilled — users enter exact library names. */

  return out;
}

export function adsProfileSetupV1(payload: AdsProfileSetup): Record<string, unknown> {
  return {
    version: ADS_PROFILE_SETUP_VERSION,
    channels: payload.channels,
    adMarketCountryCodes: payload.adMarketCountryCodes,
    scrape: payload.scrape,
  };
}

/** Best-effort TikTok display handle from legacy profile URL field. */
function tiktokKeywordFromLegacyUrl(ttUrl: string): string {
  const t = ttUrl.trim();
  if (!t) return "";
  const parsed = normalizeDiscoveredIds(parseSocialLinks([t]));
  return parsed.tiktok ? parsed.tiktok.replace(/^@+/, "") : "";
}

function pinterestKeywordLegacy(pinUrlOrHandle: string): string {
  const t = pinUrlOrHandle.trim();
  if (!t) return "";
  if (/pinterest\.com/i.test(t)) {
    try {
      const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0]) return decodeURIComponent(parts[0]!);
    } catch {
      /* ignore */
    }
  }
  return t.replace(/^\/+/, "").replace(/^@+/, "");
}

export function parseAdsProfileSetup(raw: unknown): AdsProfileSetup | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const channelsRaw = o.channels;
  const marketsRaw = o.adMarketCountryCodes;
  const scrapeRaw = o.scrape;
  if (!Array.isArray(channelsRaw) || !Array.isArray(marketsRaw) || !scrapeRaw || typeof scrapeRaw !== "object") {
    return null;
  }
  const scrape = scrapeRaw as Record<string, unknown>;
  const str = (k: keyof WorkspaceAdsScrapeHints): string =>
    typeof scrape[k] === "string" ? (scrape[k] as string).trim() : "";

  const websiteUrl =
    str("websiteUrl") || (typeof scrape.website_url === "string" ? scrape.website_url.trim() : "");
  const fb = str("facebookUrl");
  const ig = str("instagramUrl");
  const ttUrl = str("tikTokUrl");
  const metaAdsLibraryUrl = str("metaAdsLibraryUrl");
  const googleFromSite = websiteUrl ? extractDomain(websiteUrl) : "";

  const channels = channelsRaw.filter((c): c is ChannelId =>
    typeof c === "string" && ["meta", "google", "tiktok", "linkedin", "pinterest", "snapchat"].includes(c),
  );
  const adMarketCountryCodes = marketsRaw.filter((c): c is string => typeof c === "string" && c.trim().length > 0);

  const tiktokKeyword = str("tiktokKeyword") || tiktokKeywordFromLegacyUrl(ttUrl);
  const pinExtra =
    typeof scrape.pinterestUrl === "string"
      ? scrape.pinterestUrl.trim()
      : typeof scrape.pinterest === "string"
        ? (scrape.pinterest as string).trim()
        : "";
  const pinterestKeyword =
    str("pinterestKeyword") || (pinExtra ? pinterestKeywordLegacy(pinExtra) : "");

  const rawTransparency = str("googleAdsTransparencyUrl");
  const rawGoogleDomain = str("googleAdsDomain");
  const migratedTransparency =
    !rawTransparency && rawGoogleDomain ? canonicalGoogleAdsTransparencyStartUrl(rawGoogleDomain) : null;
  const googleAdsTransparencyUrl = rawTransparency || migratedTransparency || "";
  const googleAdsDomain =
    migratedTransparency ? "" : rawGoogleDomain || (!googleAdsTransparencyUrl ? googleFromSite : "");

  return {
    channels,
    adMarketCountryCodes,
    scrape: {
      websiteUrl,
      metaAdsLibraryUrl,
      googleAdsTransparencyUrl,
      googleAdsDomain,
      linkedInUrl: str("linkedInUrl"),
      tiktokKeyword,
      pinterestKeyword,
      snapchatKeyword: str("snapchatKeyword"),
      facebookUrl: fb,
      instagramUrl: ig,
      tikTokUrl: ttUrl,
      youTubeUrl: str("youTubeUrl"),
    },
  };
}

/** Map onboarding scrape URLs + domain into Ads Library identifiers (minimal subset). */
export function scrapeHintsToPlatformIds(params: {
  scrape: WorkspaceAdsScrapeHints;
  workspaceDomain: string;
  channels: ChannelId[];
}): Record<string, string> {
  const channels = new Set(params.channels);
  const { scrape, workspaceDomain } = params;
  const urls = [
    scrape.metaAdsLibraryUrl.trim(),
    scrape.facebookUrl.trim(),
    scrape.instagramUrl.trim(),
    scrape.linkedInUrl.trim(),
    scrape.youTubeUrl.trim(),
  ].filter(Boolean);
  const parsed = normalizeDiscoveredIds(parseSocialLinks(urls));

  const out: Record<string, string> = {};
  const put = (k: string, v: string | undefined) => {
    const t = typeof v === "string" ? v.trim() : "";
    if (!t) return;
    out[k] = t;
  };

  if (channels.has("meta")) {
    const direct = scrape.metaAdsLibraryUrl.trim();
    if (direct) {
      const normalized = /^https?:\/\//i.test(direct) ? direct : `https://${direct}`;
      const low = normalized.toLowerCase();
      if (
        (low.includes("facebook.com") || low.includes("fb.com")) &&
        !low.includes("instagram.com")
      ) {
        const canon = canonicalMetaAdsLibraryUrl(direct) ?? canonicalMetaAdsLibraryUrl(normalized);
        if (canon) {
          put("metaPageUrl", canon);
          const pid = extractMetaAdsLibraryPageId(direct) ?? extractMetaAdsLibraryPageId(normalized);
          if (pid) put("meta", pid);
        } else {
          put("metaPageUrl", normalized);
        }
      }
    }
    if (!out.meta && !out.metaPageUrl) {
      const pm = parsed.meta ?? parsed.metaPageUrl;
      const purl = parsed.metaPageUrl ?? parsed.meta;
      const canonM = pm ? canonicalMetaAdsLibraryUrl(String(pm)) : null;
      const canonU = purl ? canonicalMetaAdsLibraryUrl(String(purl)) : null;
      const canon = canonM ?? canonU;
      if (canon) {
        put("metaPageUrl", canon);
        const pid =
          extractMetaAdsLibraryPageId(String(pm ?? "")) ?? extractMetaAdsLibraryPageId(String(purl ?? ""));
        if (pid) put("meta", pid);
      } else {
        put("meta", parsed.meta ?? parsed.metaPageUrl);
        put("metaPageUrl", parsed.metaPageUrl ?? parsed.meta);
      }
    }
  }

  const googleTransparencyCanon = canonicalGoogleAdsTransparencyStartUrl(scrape.googleAdsTransparencyUrl.trim());
  if (channels.has("google") && googleTransparencyCanon) {
    put("google", googleTransparencyCanon);
  }

  if (channels.has("tiktok")) {
    const kw = scrape.tiktokKeyword.trim();
    if (kw) put("tiktok", kw.startsWith("@") ? kw : `@${kw.replace(/^@+/, "")}`);
  }

  if (channels.has("linkedin")) {
    const direct = scrape.linkedInUrl.trim();
    if (direct) {
      const normalized = /^https?:\/\//i.test(direct) ? direct : `https://${direct}`;
      const low = normalized.toLowerCase();
      if (low.includes("linkedin.com")) {
        const canon = canonicalLinkedInAdLibraryUrl(direct) ?? canonicalLinkedInAdLibraryUrl(normalized);
        put("linkedin", canon ?? normalized);
      }
    }
    if (!out.linkedin) {
      const pli = parsed.linkedin;
      if (pli) {
        const canon = canonicalLinkedInAdLibraryUrl(String(pli));
        put("linkedin", canon ?? String(pli).trim());
      }
    }
  }

  if (parsed.youtube?.trim()) put("youtube", parsed.youtube);

  if (channels.has("pinterest")) {
    const pk = scrape.pinterestKeyword.trim();
    if (pk) {
      if (/pinterest\.com/i.test(pk)) put("pinterest", pk.startsWith("http") ? pk : `https://${pk}`);
      else put("pinterest", `https://www.pinterest.com/${pk.replace(/^@+/, "").replace(/^\/+/, "")}`);
    }
  }

  if (channels.has("snapchat")) {
    const kw = scrape.snapchatKeyword.trim();
    if (kw) {
      put("snapchat", kw.startsWith("@") ? kw : `@${kw.replace(/^@+/, "")}`);
    }
  }

  return out;
}

/** Hydrate workspace scrape form fields from saved competitor / sidebar platform ids. */
export function platformIdsToWorkspaceScrapeHints(
  ids: Record<string, string>,
  domain: string,
): WorkspaceAdsScrapeHints {
  const row = emptyWorkspaceScrapeRow(domain);
  const metaPage = ids.metaPageUrl?.trim() || "";
  const metaId = ids.meta?.trim() || "";
  if (metaPage) {
    row.metaAdsLibraryUrl = metaPage;
  } else if (metaId) {
    row.metaAdsLibraryUrl = `https://www.facebook.com/ads/library/?view_all_page_id=${encodeURIComponent(metaId)}`;
  }
  row.googleAdsTransparencyUrl = ids.google?.trim() || "";
  row.linkedInUrl = ids.linkedin?.trim() || "";
  row.tiktokKeyword = (ids.tiktok?.trim() || "").replace(/^@+/, "");
  const pin = ids.pinterest?.trim() || ids.pinterestAdvertiserName?.trim() || "";
  row.pinterestKeyword = pin.includes("pinterest.com") ? pinterestKeywordLegacy(pin) : pin.replace(/^@+/, "");
  row.snapchatKeyword = (ids.snapchat?.trim() || "").replace(/^@+/, "");
  return row;
}
