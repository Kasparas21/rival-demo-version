import type {
  FacebookAdLibraryItem,
  GoogleCompanyAdItem,
  LinkedInAdItem,
} from "@/lib/ad-library/apify-raw-types";

/** Safe http(s) href for ad destination links; null if `text` is not a valid URL. */
export function safeHttpsUrl(text: string): string | null {
  const t = text.trim();
  if (!/^https?:\/\//i.test(t)) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

/** Meta / Facebook grid card */
export type MetaAdCard = {
  id: string;
  headline: string;
  desc: string;
  cta: string;
  subtext: string;
  img: string;
  isVideo: boolean;
  videoUrl?: string;
  adLibraryUrl: string;
  startedAt?: number;
  endedAt?: number;
  impressionsIndex?: number;
  /** Advertiser shown in card header (from Ad Library) */
  pageName: string;
  pageProfilePic?: string;
};

/** Google / YouTube style row */
export type GoogleAdRow =
  | {
      type: "google";
      id: string;
      title: string;
      url: string;
      desc: string;
      img: string | null;
      /** Primary ad body from API (text ads often have no `imageUrl`) */
      creativeCopy?: string | null;
      /** Compact run dates for footer (avoids repeating full `desc`) */
      shownSummary?: string | null;
      /** Direct link to this creative in Google Ads Transparency Center */
      adUrl: string;
      /** API `format`: text | image | video */
      format?: string;
      /** Advertiser / brand line (Transparency Center “Ad details”) */
      advertiserName?: string | null;
      /** Human-readable last shown date */
      lastShownLabel?: string | null;
      /** Raw Google “Preview URL” from the API (displayads-formats… / googlesyndication…) */
      previewUrl?: string | null;
    }
  | {
      type: "youtube";
      id: string;
      title: string;
      channel: string;
      views: string;
      thumbnail: string;
      adUrl: string;
      format?: string;
    };

export type LinkedInAdCard = {
  id: string;
  headline: string;
  desc: string;
  url: string;
  img: string;
  /** Direct video file URL for in-app playback (not a profile photo) */
  videoUrl?: string | null;
  advertiser: string;
  /** Open in LinkedIn / destination */
  adUrl: string;
};

export type TikTokAdCard = {
  id: string;
  headline: string;
  desc: string;
  url: string;
  img: string;
  advertiser: string;
  adUrl: string;
  /** Direct MP4 or TikTok CDN video URL when available */
  videoUrl?: string;
  /** Formatted for display (e.g. MM/DD/YYYY) */
  firstShown?: string | null;
  lastShown?: string | null;
  /** e.g. "1K-10K" from Ad Audience / reach */
  uniqueUsersSeen?: string | null;
};

/** Microsoft Advertising Transparency (EEA) — Apify codebyte/microsoft-ads-library */
export type MicrosoftAdCard = {
  id: string;
  headline: string;
  desc: string;
  url: string;
  img: string;
  advertiser: string;
  adUrl: string;
  /** e.g. "10k - 50k" when includeAdDetails was used */
  impressionsRange?: string | null;
};

/** Pinterest Ad Transparency (DSA regions) — Apify zadexinho/pinterest-ads-scraper */
export type PinterestAdCard = {
  id: string;
  headline: string;
  desc: string;
  url: string;
  img: string;
  /** Pin / ad video file when exposed by the actor (MP4/HLS) */
  videoUrl?: string | null;
  advertiser: string;
  adUrl: string;
  /** e.g. from reach.totalEU */
  reachSummary?: string | null;
};

function containsTemplateTokens(value: string): boolean {
  return /\{\{[^}]+\}\}/.test(value);
}

function cleanMetaText(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (containsTemplateTokens(trimmed)) return "";
  return trimmed;
}

function pickMetaImage(snap: FacebookAdLibraryItem["snapshot"]): { url: string; isVideo: boolean } {
  if (!snap) return { url: "", isVideo: false };
  const fmt = (snap.display_format || "").toUpperCase();
  const card = snap.cards?.[0];
  if (card?.video_preview_image_url) {
    return { url: card.video_preview_image_url, isVideo: true };
  }
  if (card?.video_hd_url || card?.video_sd_url) {
    return { url: card.video_preview_image_url || "", isVideo: true };
  }
  const cardImage = card?.resized_image_url || card?.original_image_url || "";
  if (cardImage) {
    return { url: cardImage, isVideo: false };
  }
  const v = snap.videos?.[0];
  if (v?.video_preview_image_url) {
    return { url: v.video_preview_image_url, isVideo: true };
  }
  if (v?.video_hd_url || v?.video_sd_url) {
    return { url: v.video_preview_image_url || "", isVideo: true };
  }
  const img = snap.images?.[0];
  const url = img?.resized_image_url || img?.original_image_url || "";
  return { url, isVideo: fmt === "VIDEO" && Boolean(v) };
}

function pickMetaVideoUrl(snap: FacebookAdLibraryItem["snapshot"]): string | undefined {
  if (!snap) return undefined;
  const card = snap.cards?.[0];
  const fromCard = card?.video_hd_url || card?.video_sd_url;
  if (fromCard) return fromCard;
  const first = snap.videos?.[0];
  const fromSnapshot = first?.video_hd_url || first?.video_sd_url;
  return fromSnapshot || undefined;
}

export function facebookItemToMetaCard(item: FacebookAdLibraryItem, index: number): MetaAdCard | null {
  const snap = item.snapshot;
  const card = snap?.cards?.[0];
  const body = cleanMetaText(snap?.body?.text || "") || cleanMetaText(card?.body || "");
  const title =
    cleanMetaText(card?.title || "") ||
    cleanMetaText(snap?.title || "") ||
    cleanMetaText(snap?.caption || "");
  const pageName =
    snap?.page_name?.trim() ||
    snap?.current_page_name?.trim() ||
    item.page_name?.trim() ||
    "Sponsored";
  const cta = snap?.cta_text?.trim() || "Learn more";
  const { url: img, isVideo } = pickMetaImage(snap);
  const videoUrl = pickMetaVideoUrl(snap);
  const caption = cleanMetaText(snap?.caption || "");
  let headline: string;
  let desc: string;
  if (!title && !caption && body) {
    headline = body;
    desc = "";
  } else {
    headline = title || caption || body || "Ad";
    desc = body || title || caption || "—";
  }
  const subtext = cleanMetaText(String(card?.link_url || snap?.link_url || "")) || pageName;
  const id = item.ad_archive_id || item.collation_id || `fb-${index}`;
  const adLibraryUrl =
    item.ad_library_url?.trim() ||
    (item.ad_archive_id
      ? `https://www.facebook.com/ads/library/?id=${encodeURIComponent(item.ad_archive_id)}`
      : "https://www.facebook.com/ads/library/");
  const pic = snap?.page_profile_picture_url || undefined;
  if (!item.ad_archive_id && !item.collation_id && !snap && !item.page_name) return null;
  return {
    id: String(id),
    headline,
    desc,
    cta: cta === "No button" ? "Learn more" : cta,
    subtext,
    img: img || snap?.page_profile_picture_url || "",
    isVideo,
    adLibraryUrl,
    startedAt: item.start_date,
    endedAt: item.end_date,
    impressionsIndex: item.impressions_with_index?.impressions_index,
    pageName,
    pageProfilePic: pic,
    ...(videoUrl ? { videoUrl } : {}),
  };
}

/** ScrapeCreators (and proxies) may use different array keys or nest payloads. */
export function extractGoogleAdsFromResponse(body: unknown): unknown[] {
  if (!body || typeof body !== "object") return [];
  const d = body as Record<string, unknown>;
  if (Array.isArray(d.ads)) return d.ads;
  const data = d.data;
  if (data && typeof data === "object") {
    const inner = data as Record<string, unknown>;
    if (Array.isArray(inner.ads)) return inner.ads;
  }
  if (Array.isArray(d.results)) return d.results;
  return [];
}

function transparencyCreativeUrl(advertiserId: string, creativeId: string): string {
  return `https://adstransparency.google.com/advertiser/${encodeURIComponent(advertiserId)}/creative/${encodeURIComponent(creativeId)}`;
}

function cleanHost(input: string): string {
  return input.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || input;
}

/** True when URL is Google’s favicon proxy (too small / wrong for creative previews). */
export function isGoogleFaviconUrl(url: string): boolean {
  return /google\.com\/s2\/favicons|gstatic\.com\/favicon/i.test(url);
}

/** Extract YouTube video id from watch / embed / shorts / youtu.be URLs. */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  const fromQuery = u.match(/[?&]v=([a-zA-Z0-9_-]{11})(?:[&#/]|$)/);
  if (fromQuery?.[1]) return fromQuery[1];
  const fromShort = u.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (fromShort?.[1]) return fromShort[1];
  const fromPath = u.match(/youtube\.com\/(?:embed|shorts|live|v)\/([a-zA-Z0-9_-]{11})/);
  return fromPath?.[1] ?? null;
}

/** YouTube thumbnail when only a watch URL is present (or embedded in another field). */
export function youtubeThumbnailFromUrl(url: string): string | null {
  const id = extractYouTubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/** Human label for outbound links on Google / YouTube ad cards (matches Meta/TikTok CTA style). */
export function googleAdsExternalLinkLabel(url: string): { primary: string; hint?: string } {
  const u = url.trim();
  if (!u) return { primary: "Open link" };
  try {
    const parsed = new URL(u);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "adstransparency.google.com") {
      return { primary: "View in Google Ads Transparency", hint: "Google Ads Library" };
    }
    if (host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com")) {
      return { primary: "Watch on YouTube", hint: host };
    }
    return { primary: `Open ${host}`, hint: host };
  } catch {
    return { primary: "Open link" };
  }
}

/**
 * Apify Google Transparency items often nest images under `images[]`, `creative`, `variants`, etc.
 */
function findFirstGoogleCreativeImageUrl(obj: unknown, depth = 0): string | null {
  if (depth > 6 || obj === null || obj === undefined) return null;
  if (typeof obj === "string") {
    const s = obj.trim();
    if (!/^https?:\/\//i.test(s) || s.length < 12) return null;
    if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(s)) return s;
    if (
      /googleusercontent|displayads-formats|ggpht\.com|gstatic\.com|doubleclick|googleadservices|googlesyndication|storage\.googleapis|ytimg\.com|ggpht/i.test(
        s
      )
    )
      return s;
    return null;
  }
  if (Array.isArray(obj)) {
    for (const x of obj) {
      const f = findFirstGoogleCreativeImageUrl(x, depth + 1);
      if (f) return f;
    }
    return null;
  }
  if (typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    for (const k of [
      "imageUrl",
      "image_url",
      "thumbnailUrl",
      "thumbnail_url",
      "previewImage",
      "previewUrl",
      "url",
      "src",
      "image",
    ]) {
      const v = o[k];
      if (typeof v === "string" && v.trim() && /^https?:\/\//i.test(v.trim())) {
        const t = v.trim();
        const hit = findFirstGoogleCreativeImageUrl(t, depth + 1);
        if (hit) return hit;
      }
    }
    for (const v of Object.values(o)) {
      const f = findFirstGoogleCreativeImageUrl(v, depth + 1);
      if (f) return f;
    }
  }
  return null;
}

/**
 * Normalize one ad object: camelCase + snake_case + shallow nested `ad` / `creative` / `advertiser`.
 */
export function normalizeGoogleApiItem(raw: unknown): GoogleCompanyAdItem {
  if (!raw || typeof raw !== "object") return {};
  const o: Record<string, unknown> = { ...(raw as Record<string, unknown>) };

  const merge = (x: unknown) => {
    if (x && typeof x === "object") Object.assign(o, x as Record<string, unknown>);
  };
  merge(o.ad);
  merge(o.creative);
  if (o.details && typeof o.details === "object") {
    const det = o.details as Record<string, unknown>;
    if (det.creative && typeof det.creative === "object") merge(det.creative);
    merge(det);
  }
  if (o.assets && typeof o.assets === "object") merge(o.assets);
  if (o.advertiser && typeof o.advertiser === "object") {
    const a = o.advertiser as Record<string, unknown>;
    if (!o.advertiserName && typeof a.name === "string") o.advertiserName = a.name;
    if (!o.domain && typeof a.domain === "string") o.domain = a.domain;
    if (!o.advertiserId && typeof a.id === "string") o.advertiserId = a.id;
  } else if (typeof o.advertiser === "string" && o.advertiser.trim()) {
    o.advertiserName = o.advertiser.trim();
  }

  const pick = (keys: string[]): string | undefined => {
    for (const k of keys) {
      const v = o[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return undefined;
  };

  const pickImage = (): string | null | undefined => {
    /** Transparency Center / Apify “Preview URL” — use as-is for creative preview (highest priority). */
    for (const k of ["previewUrl", "preview_url", "Preview URL", "previewURL"]) {
      if (!(k in o)) continue;
      const v = o[k];
      if (v === null) return null;
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    const imageUrls = o.imageUrls;
    if (Array.isArray(imageUrls) && typeof imageUrls[0] === "string" && imageUrls[0].trim()) {
      return imageUrls[0].trim();
    }
    for (const k of [
      "imageUrl",
      "image_url",
      "image",
      "thumbnailUrl",
      "thumbnail_url",
      "previewImage",
      "preview_image",
      "mediaUrl",
      "media_url",
      "creativeImageUrl",
      "creative_image_url",
      "primaryImageUrl",
      "defaultImageUrl",
    ]) {
      if (!(k in o)) continue;
      const v = o[k];
      if (v === null) return null;
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return undefined;
  };

  if (Array.isArray(o.images) && o.images.length > 0 && !pickImage()) {
    const firstImg = o.images[0];
    if (typeof firstImg === "string" && firstImg.trim()) {
      o.imageUrl = firstImg.trim();
    } else if (firstImg && typeof firstImg === "object") {
      const u = (firstImg as Record<string, unknown>).url ?? (firstImg as Record<string, unknown>).imageUrl;
      if (typeof u === "string" && u.trim()) o.imageUrl = u.trim();
    }
  }

  const deepImageUrl = findFirstGoogleCreativeImageUrl(o);

  const rawId = o.id;
  const idStr = typeof rawId === "string" && rawId.trim() ? rawId.trim() : undefined;
  const creativeFromId = idStr && /^CR\d+/i.test(idStr) ? idStr : undefined;

  return {
    advertiserId: pick(["advertiserId", "advertiser_id", "advertiserID"]),
    creativeId: pick(["creativeId", "creative_id", "creativeID"]) || creativeFromId,
    format: pick(["format", "adFormat", "ad_format", "creativeFormat", "creative_format"]),
    adUrl: pick(["adUrl", "ad_url", "url", "transparencyUrl", "transparency_url", "permalink"]),
    advertiserName: pick([
      "advertiserName",
      "advertiser_name",
      "advertiserDisplayName",
      "advertiser_display_name",
      "advertiserNameText",
    ]),
    domain: pick(["domain", "advertiserDomain", "advertiser_domain", "destinationDomain", "destination_domain"]),
    previewUrl: pick(["previewUrl", "preview_url", "Preview URL", "previewURL"]) ?? null,
    imageUrl: pickImage() ?? deepImageUrl ?? null,
    firstShown: pick(["firstShown", "first_shown", "firstShownDate", "first_shown_date"]),
    lastShown: pick(["lastShown", "last_shown", "lastShownDate", "last_shown_date"]),
    headline: pick(["headline", "longHeadline", "long_headline"]),
    description: pick(["description", "body", "snippet", "text"]),
    title: pick(["title", "adTitle", "ad_title"]),
  };
}

export type GoogleRowContext = {
  /** Domain passed to GET /v1/google/company/ads — use when API omits advertiser domain. */
  queryDomain: string;
};

/** Human label for API `format` (text / image / video). */
export function googleCreativeFormatLabel(format: string | undefined): string | null {
  const f = (format || "").toLowerCase();
  if (f === "text") return "Text ad";
  if (f === "image") return "Image ad";
  if (f === "video") return "Video ad";
  return format?.trim() ? format.trim() : null;
}

export function googleItemToRow(
  item: GoogleCompanyAdItem,
  index: number,
  ctx?: GoogleRowContext
): GoogleAdRow {
  const queryDomain = ctx?.queryDomain?.trim() || "";
  const displayDomain = item.domain?.trim() || queryDomain;

  const advertiserId = item.advertiserId?.trim();
  const creativeId = item.creativeId?.trim();

  let adUrl = item.adUrl?.trim() || "";
  if (!adUrl && advertiserId && creativeId) {
    adUrl = transparencyCreativeUrl(advertiserId, creativeId);
  }
  if (!adUrl && queryDomain) {
    adUrl = `https://adstransparency.google.com/?region=any&domain=${encodeURIComponent(queryDomain)}`;
  }

  /** Include `index` so keys stay unique when the API returns duplicate advertiser/creative pairs. */
  const id = `${advertiserId ?? "ad"}-${creativeId ?? "cr"}-${index}`;
  const format = (item.format || "").toLowerCase();
  const fromHeadline =
    item.headline?.trim() || item.title?.trim() || item.description?.trim()?.slice(0, 120);

  if (format === "video" || /youtube\.com|youtu\.be/i.test(adUrl)) {
    const title =
      fromHeadline ||
      (item.advertiserName && displayDomain
        ? `${item.advertiserName} — ${displayDomain}`
        : item.advertiserName || displayDomain || (creativeId ? `Video ad (${creativeId})` : "Video ad"));
    const pu = item.previewUrl?.trim() || "";
    const iu = item.imageUrl?.trim() || "";
    const nested = findFirstGoogleCreativeImageUrl(item as unknown);
    const ytFromFields = [
      adUrl,
      pu,
      iu,
      item.description,
      item.headline,
      item.title,
    ]
      .map((s) => (typeof s === "string" ? youtubeThumbnailFromUrl(s) : null))
      .find(Boolean);

    let thumb = "";
    if (iu && !isGoogleFaviconUrl(iu)) thumb = iu;
    else if (pu && findFirstGoogleCreativeImageUrl(pu)) thumb = pu;
    else if (nested && !isGoogleFaviconUrl(nested)) thumb = nested;
    else if (ytFromFields) thumb = ytFromFields;
    else thumb = youtubeThumbnailFromUrl(adUrl) || "";

    return {
      type: "youtube",
      id,
      title,
      channel: item.advertiserName || cleanHost(displayDomain) || "Advertiser",
      views: item.lastShown ? `Updated ${item.lastShown.slice(0, 10)}` : "Google Ads Transparency",
      thumbnail: thumb,
      adUrl,
      format: item.format || "video",
    };
  }

  const title =
    fromHeadline ||
    (item.advertiserName && displayDomain
      ? `${item.advertiserName} — ${cleanHost(displayDomain)}`
      : item.advertiserName || (displayDomain ? cleanHost(displayDomain) : null) || (creativeId ? `Creative ${creativeId}` : advertiserId ? `Advertiser ${advertiserId}` : "Google Transparency ad"));

  const descParts: string[] = [];
  const fmtLabel = googleCreativeFormatLabel(item.format);
  if (fmtLabel) descParts.push(fmtLabel);
  if (item.description?.trim()) descParts.push(item.description.trim());
  if (item.firstShown || item.lastShown) {
    descParts.push(
      `Shown ${item.firstShown?.slice(0, 10) ?? "?"} → ${item.lastShown?.slice(0, 10) ?? "?"}`
    );
  }
  if (descParts.length === 0) {
    descParts.push("Open in Google Ads Transparency Center for the full creative.");
  }

  const urlLine = displayDomain ? cleanHost(displayDomain) : cleanHost(adUrl || "") || "adstransparency.google.com";

  const shownSummary =
    item.firstShown || item.lastShown
      ? `${item.firstShown?.slice(0, 10) ?? "…"} – ${item.lastShown?.slice(0, 10) ?? "…"}`
      : null;

  const previewUrl = item.previewUrl?.trim() || null;
  let img: string | null = previewUrl || item.imageUrl?.trim() || null;
  if (!img && displayDomain) {
    img = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanHost(displayDomain))}&sz=128`;
  }

  const lastShownLabel = item.lastShown?.trim()
    ? (() => {
        const d = new Date(item.lastShown);
        return Number.isNaN(d.getTime())
          ? item.lastShown!.slice(0, 16)
          : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      })()
    : null;

  return {
    type: "google",
    id,
    title,
    url: urlLine,
    desc: descParts.join(" · "),
    img,
    creativeCopy: item.description?.trim() || null,
    shownSummary,
    adUrl,
    format: item.format,
    advertiserName: item.advertiserName?.trim() || null,
    lastShownLabel,
    previewUrl,
  };
}

export function linkedInItemToCard(item: LinkedInAdItem, index: number): LinkedInAdCard {
  const id = item.id || `li-${index}`;
  const desc =
    item.description?.trim() ||
    item.headline?.trim() ||
    "—";
  const headline = item.headline?.trim() || item.adType?.trim() || "Sponsored";
  let img = item.image || item.carouselImages?.[0] || "";
  const videoUrl = item.video?.trim();
  if (img && isLikelyLinkedInProfileOrAuthorPhoto(img)) {
    img = "";
  }
  const rawDest = item.destinationUrl || item.advertiserLinkedinPage || "";
  const detail = item.adDetailUrl?.trim();
  const adUrl =
    detail && /^https?:\/\//i.test(detail)
      ? detail
      : rawDest && /^https?:\/\//i.test(rawDest)
        ? rawDest
        : item.id
          ? `https://www.linkedin.com/ad-library/detail/${encodeURIComponent(String(item.id))}`
          : "https://www.linkedin.com/ad-library/";
  return {
    id: String(id),
    headline,
    desc,
    url: rawDest.replace(/^https?:\/\//, "").slice(0, 48) || "linkedin.com",
    img,
    videoUrl: videoUrl || undefined,
    advertiser: item.advertiser || item.poster || "Advertiser",
    adUrl,
  };
}

/** Map Apify LinkedIn dataset rows → legacy LinkedInAdItem (automation-lab or legacy data_xplorer shape). */
export function linkedInApifyItemToLegacyItem(raw: Record<string, unknown>, index: number): LinkedInAdItem {
  const legacyMedia = Array.isArray(raw.media) && (raw.media as unknown[]).length > 0;
  const automationLab =
    !legacyMedia &&
    (typeof raw.detailUrl === "string" ||
      typeof raw.bodyText === "string" ||
      typeof raw.mediaUrl === "string" ||
      typeof raw.advertiserLinkedInUrl === "string" ||
      typeof raw.advertiserCompanyId === "string");

  if (automationLab) {
    const adId = raw.adId ?? raw.id;
    const m = extractLinkedInAutomationLabMedia(raw);
    return {
      id: adId != null ? String(adId) : `li-${index}`,
      headline: typeof raw.headline === "string" ? raw.headline : undefined,
      description: typeof raw.bodyText === "string" ? raw.bodyText : undefined,
      image: m.image,
      video: m.video,
      advertiser: typeof raw.advertiserName === "string" ? raw.advertiserName : undefined,
      advertiserLinkedinPage:
        typeof raw.advertiserLinkedInUrl === "string" ? raw.advertiserLinkedInUrl : undefined,
      destinationUrl: typeof raw.ctaUrl === "string" ? raw.ctaUrl : undefined,
      adDetailUrl: typeof raw.detailUrl === "string" ? raw.detailUrl : undefined,
      cta: typeof raw.ctaLabel === "string" ? raw.ctaLabel : undefined,
      adType: typeof raw.adFormat === "string" ? raw.adFormat : undefined,
    };
  }

  const content = raw.content as
    | { body?: string; headline?: string; ctaText?: string }
    | undefined;
  const media = Array.isArray(raw.media) ? raw.media : [];
  const fromArr = media.length ? extractLinkedInMediaFromArray(media as unknown[]) : { image: undefined, video: undefined };
  const adId = raw.adId ?? raw.id;

  return {
    id: adId != null ? String(adId) : `li-${index}`,
    description: content?.body ?? undefined,
    headline: content?.headline ?? undefined,
    image: fromArr.image,
    video: fromArr.video,
    advertiser: typeof raw.advertiserName === "string" ? raw.advertiserName : undefined,
    destinationUrl: typeof raw.externalLink === "string" ? raw.externalLink : undefined,
    cta: typeof content?.ctaText === "string" ? content.ctaText : undefined,
  };
}

function firstString(o: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/** Recursively find a likely creative image URL (Microsoft actor field names vary). */
function deepFindHttpsImageUrl(value: unknown, depth = 0): string {
  if (depth > 10) return "";
  if (typeof value === "string") {
    const s = value.trim();
    if (!/^https?:\/\//i.test(s) || s.length > 4000) return "";
    if (/\.(png|jpe?g|gif|webp|avif|bmp)(\?|#|$)/i.test(s)) return s;
    return "";
  }
  if (Array.isArray(value)) {
    for (const v of value) {
      const u = deepFindHttpsImageUrl(v, depth + 1);
      if (u) return u;
    }
    return "";
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      const u = deepFindHttpsImageUrl(v, depth + 1);
      if (u) return u;
    }
  }
  return "";
}

/** LinkedIn often puts author headshots in `mediaUrl` for video ads — avoid using as creative. */
export function isLikelyLinkedInProfileOrAuthorPhoto(url: string): boolean {
  const u = url.toLowerCase();
  if (!u.includes("licdn.com") && !u.includes("linkedin.com")) return false;
  if (u.includes("profile-displayphoto")) return true;
  if (u.includes("displayphoto-shrink")) return true;
  if (/\/feedshare-profile/i.test(u)) return true;
  if (u.includes("profile_pic")) return true;
  return false;
}

function looksLikeVideoFileUrl(s: string): boolean {
  return /\.(mp4|m3u8|webm)(\?|$)/i.test(s.trim());
}

function extractLinkedInAutomationLabMedia(raw: Record<string, unknown>): {
  image?: string;
  video?: string;
} {
  const format = typeof raw.adFormat === "string" ? raw.adFormat.toUpperCase() : "";
  const wantsVideo = format.includes("VIDEO");

  const videoDirect =
    firstString(raw, [
      "videoUrl",
      "VideoUrl",
      "transcodedVideoUrl",
      "TranscodedVideoUrl",
      "videoMp4Url",
      "mp4Url",
      "mediaVideoUrl",
    ]) || undefined;

  const mediaUrl = typeof raw.mediaUrl === "string" ? raw.mediaUrl.trim() : "";
  const mediaIsVideo = looksLikeVideoFileUrl(mediaUrl);

  const thumb =
    firstString(raw, [
      "thumbnailUrl",
      "ThumbnailUrl",
      "previewImageUrl",
      "PreviewImageUrl",
      "posterUrl",
      "PosterUrl",
      "videoPosterUrl",
      "VideoPosterUrl",
      "creativeImageUrl",
      "CreativeImageUrl",
      "imageUrl",
      "ImageUrl",
      "thumbnail",
    ]) || undefined;

  let video = videoDirect || (mediaIsVideo ? mediaUrl : undefined);
  let image = thumb;

  if (!image && mediaUrl && !mediaIsVideo) {
    image = mediaUrl;
  }
  if (wantsVideo && !video && mediaIsVideo) {
    video = mediaUrl;
  }

  if (image && isLikelyLinkedInProfileOrAuthorPhoto(image)) {
    image = undefined;
  }
  if (thumb && !image && !isLikelyLinkedInProfileOrAuthorPhoto(thumb)) {
    image = thumb;
  }

  return { image, video };
}

function extractLinkedInMediaFromArray(media: unknown[]): { image?: string; video?: string } {
  let image: string | undefined;
  let video: string | undefined;

  for (const entry of media) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const type = String(o.type ?? o.mediaType ?? "").toUpperCase();
    const url =
      (typeof o.url === "string" ? o.url : "") ||
      (typeof o.mediaUrl === "string" ? o.mediaUrl : "") ||
      (typeof o.source === "string" ? o.source : "");
    const th =
      (typeof o.thumbnail === "string" ? o.thumbnail : "") ||
      (typeof o.thumbnailUrl === "string" ? o.thumbnailUrl : "") ||
      (typeof o.previewImage === "string" ? o.previewImage : "");
    const urlIsVideo = looksLikeVideoFileUrl(url);

    if (type.includes("VIDEO") || urlIsVideo) {
      if (urlIsVideo) video = url.trim();
      if (th && !isLikelyLinkedInProfileOrAuthorPhoto(th)) image = th.trim();
      else if (!video && url && !urlIsVideo) image = url.trim();
    } else if (url && !urlIsVideo && !image) {
      image = url.trim();
    }
  }

  if (image && isLikelyLinkedInProfileOrAuthorPhoto(image)) image = undefined;
  return { image, video };
}

function deepFindHttpsVideoUrl(value: unknown, depth = 0): string {
  if (depth > 10) return "";
  if (typeof value === "string") {
    const s = value.trim();
    if (!/^https?:\/\//i.test(s) || s.length > 4000) return "";
    if (looksLikeVideoFileUrl(s)) return s;
    return "";
  }
  if (Array.isArray(value)) {
    for (const v of value) {
      const u = deepFindHttpsVideoUrl(v, depth + 1);
      if (u) return u;
    }
    return "";
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      const u = deepFindHttpsVideoUrl(v, depth + 1);
      if (u) return u;
    }
  }
  return "";
}

/** Map codebyte/microsoft-ads-library (or compatible) dataset row → card. */
export function microsoftDatasetItemToCard(raw: Record<string, unknown>, index: number): MicrosoftAdCard {
  const adId = raw.AdId ?? raw.adId ?? raw.id ?? raw.ID;
  const id = adId != null ? String(adId) : `ms-${index}`;

  const headline =
    firstString(raw, [
      "Title",
      "title",
      "Headline",
      "headline",
      "adTitle",
      "AdTitle",
    ]) || "Microsoft ad";
  const desc = firstString(raw, ["Description", "description", "Body", "bodyText", "adDescription", "AdDescription"]) || "—";
  const advertiser =
    firstString(raw, ["AdvertiserName", "advertiserName", "Advertiser"]) || "Advertiser";

  const adDetails = raw.AdDetails ?? raw.adDetails;
  let impressionsRange: string | null = null;
  if (adDetails && typeof adDetails === "object") {
    const d = adDetails as Record<string, unknown>;
    const tr = d.TotalImpressionsRange ?? d.totalImpressionsRange;
    if (typeof tr === "string" && tr.trim()) impressionsRange = tr.trim();
  }
  if (!impressionsRange) {
    const ai = raw.adImpressions ?? raw.AdImpressions;
    if (typeof ai === "string" && ai.trim()) impressionsRange = ai.trim();
  }

  const img =
    firstString(raw, [
      "ImageUrl",
      "imageUrl",
      "MediaUrl",
      "mediaUrl",
      "ThumbnailUrl",
      "thumbnailUrl",
      "PreviewImageUrl",
      "previewImageUrl",
      "CreativeImageUrl",
      "creativeImageUrl",
    ]) ||
    deepFindHttpsImageUrl(adDetails) ||
    deepFindHttpsImageUrl(raw) ||
    "";

  const dest =
    firstString(raw, [
      "DestinationUrl",
      "destinationUrl",
      "FinalUrl",
      "finalUrl",
      "LandingPage",
      "landingPage",
      "adDestination",
      "AdDestination",
    ]) || "";
  const library =
    firstString(raw, ["DetailUrl", "detailUrl", "AdLibraryUrl", "adLibraryUrl", "TransparencyUrl"]) ||
    "";
  const adUrl =
    safeHttpsUrl(library) ||
    safeHttpsUrl(dest) ||
    "https://ads.microsoft.com/";

  return {
    id,
    headline,
    desc,
    url: dest.replace(/^https?:\/\//, "").split("/")[0]?.slice(0, 48) || "microsoft.com",
    img,
    advertiser,
    adUrl,
    impressionsRange,
  };
}

function formatPinterestTargetingDesc(targeting: unknown): string {
  if (!targeting || typeof targeting !== "object") return "—";
  const o = targeting as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of ["ages", "genders", "countries", "interests", "keywords"]) {
    const v = o[key];
    if (Array.isArray(v) && v.length) {
      parts.push(`${key}: ${v.map(String).join(", ")}`);
    }
  }
  return parts.length ? parts.join(" · ") : "—";
}

function pinterestReachSummary(reach: unknown): string | null {
  if (!reach || typeof reach !== "object") return null;
  const o = reach as Record<string, unknown>;
  const raw = o.totalEU ?? o.totalEu;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return null;
}

/** Map zadexinho/pinterest-ads-scraper dataset row → card (PascalCase + camelCase). */
export function pinterestDatasetItemToCard(raw: Record<string, unknown>, index: number): PinterestAdCard {
  const pinId = raw.id ?? raw.Id ?? raw.pinId;
  const id = pinId != null ? String(pinId) : `pin-${index}`;

  const headline =
    firstString(raw, ["title", "Title", "headline", "Headline"]) || "Pinterest ad";

  const advertiser =
    firstString(raw, ["advertiserName", "AdvertiserName", "advertiser"]) || "Advertiser";

  let videoUrl =
    firstString(raw, ["videoUrl", "VideoUrl", "video_url", "mp4Url", "transcodedVideoUrl"]) ||
    deepFindHttpsVideoUrl(raw) ||
    "";

  let img =
    firstString(raw, [
      "imageUrl",
      "ImageUrl",
      "image",
      "image_url",
      "thumbnailUrl",
      "ThumbnailUrl",
      "posterUrl",
      "videoPosterUrl",
      "previewImageUrl",
    ]) ||
    deepFindHttpsImageUrl(raw) ||
    "";

  if (img && looksLikeVideoFileUrl(img)) {
    if (!videoUrl) videoUrl = img;
    img = "";
  }

  const pinUrl =
    firstString(raw, ["url", "Url", "pinUrl", "pin_url"]) ||
    (id ? `https://www.pinterest.com/pin/${id}/` : "");

  const productUrl =
    firstString(raw, ["productUrl", "ProductUrl", "destinationUrl", "landingUrl", "landing_url"]) ||
    "";

  const destHost = productUrl
    ? productUrl.replace(/^https?:\/\//, "").split("/")[0]?.slice(0, 48) || "—"
    : "—";

  const targeting = raw.targeting ?? raw.Targeting;
  const desc = formatPinterestTargetingDesc(targeting);

  const reachSummary = pinterestReachSummary(raw.reach ?? raw.Reach);

  const adUrl =
    safeHttpsUrl(pinUrl) ||
    safeHttpsUrl(productUrl) ||
    "https://www.pinterest.com/";

  return {
    id,
    headline,
    desc,
    url: destHost,
    img,
    videoUrl: videoUrl || undefined,
    advertiser,
    adUrl,
    reachSummary,
  };
}

function formatTikTokUiDate(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  }
  return t.length > 32 ? `${t.slice(0, 32)}…` : t;
}

function parseTikTokAdDates(dates: unknown): { first?: string; last?: string } {
  if (!Array.isArray(dates)) return {};
  let first: string | undefined;
  let last: string | undefined;
  for (const entry of dates) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const fs = firstString(o, ["FirstShown", "firstShown", "first_shown"]);
    const ls = firstString(o, ["LastShown", "lastShown", "last_shown"]);
    if (fs) first = fs;
    if (ls) last = ls;
  }
  return { first, last };
}

/** data_xplorer actor returns string lines like `Video 1: https://...` */
function parseTikTokVideoUrlFromMedia(adMedia: unknown): string | undefined {
  if (!Array.isArray(adMedia)) return undefined;
  for (const item of adMedia) {
    if (typeof item === "string") {
      const m = item.match(/^Video\s*\d*\s*:\s*(.+)$/i);
      if (m?.[1]) return m[1].trim().replace(/[,)\]}]+$/, "");
    }
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const t = String(o.type ?? "").toLowerCase();
      const u = firstString(o, ["url", "videoUrl", "preview", "src"]);
      if (u && (t === "video" || /video|\.mp4|mime_type=video/i.test(u))) return u;
    }
  }
  return undefined;
}

function parseTikTokStillImageFromMedia(adMedia: unknown): string | undefined {
  if (!Array.isArray(adMedia)) return undefined;
  for (const item of adMedia) {
    if (typeof item === "string") {
      const m = item.match(/^Image\s*\d*\s*:\s*(.+)$/i);
      if (m?.[1]) return m[1].trim().replace(/[,)\]}]+$/, "");
    }
  }
  return undefined;
}

/** Any TikTok CDN / image URL buried in the raw row (Apify shape varies). */
function deepFindTikTokImageUrl(raw: Record<string, unknown>): string | undefined {
  const walk = (obj: unknown, depth: number): string | undefined => {
    if (depth > 8 || obj === null || obj === undefined) return undefined;
    if (typeof obj === "string") {
      const s = obj.trim();
      if (!/^https?:\/\//i.test(s) || s.length < 16) return undefined;
      if (/ibyteimg|tiktokcdn|byteimg|ttwstatic|musical\.ly|p\d+-(sign\.)?tiktokcdn/i.test(s)) return s;
      if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(s)) return s;
      return undefined;
    }
    if (Array.isArray(obj)) {
      for (const x of obj) {
        const h = walk(x, depth + 1);
        if (h) return h;
      }
    }
    if (typeof obj === "object") {
      for (const v of Object.values(obj)) {
        const h = walk(v, depth + 1);
        if (h) return h;
      }
    }
    return undefined;
  };
  return walk(raw, 0);
}

function pickTikTokAudience(raw: Record<string, unknown>): string | undefined {
  const direct = firstString(raw, [
    "Ad Audience",
    "adAudience",
    "audience",
    "reach",
    "uniqueUsers",
    "Unique users seen",
  ]);
  if (direct) return direct;
  const details = raw["Ad Details"];
  if (Array.isArray(details)) {
    for (const block of details) {
      if (!block || typeof block !== "object") continue;
      const o = block as Record<string, unknown>;
      const est = firstString(o, ["Estimated Audience", "estimatedAudience", "Target Audience Size"]);
      if (est) return est;
    }
  }
  return firstString(raw, ["Ad Target Audience Size", "adTargetAudienceSize"]);
}

/** Map data_xplorer/tiktok-ads-library-pay-per-event dataset row → card. */
export function tiktokApifyItemToCard(raw: Record<string, unknown>, index: number): TikTokAdCard | null {
  const id =
    firstString(raw, ["adId", "ad_id", "AD ID", "id"]) ?? `tt-${index}`;
  const advertiser =
    firstString(raw, ["advertiserName", "Advertiser Name", "ad_sponsor", "Ad Sponsor"]) ??
    "Advertiser";
  const headline = firstString(raw, ["headline", "Headline"]) ?? advertiser;
  const desc =
    firstString(raw, ["description", "body", "copy"]) ??
    firstString(
      (raw["Ad Details"] as Record<string, unknown>) || {},
      ["copy", "text"]
    ) ??
    "—";
  const adMedia = raw["Ad Media"];
  let mediaImg: string | undefined;
  if (Array.isArray(adMedia) && adMedia[0] && typeof adMedia[0] === "object") {
    mediaImg = firstString(adMedia[0] as Record<string, unknown>, ["url", "preview"]);
  }
  if (!mediaImg && Array.isArray(adMedia)) {
    for (const item of adMedia) {
      if (typeof item === "string") {
        const cover = item.match(/^Cover\s*\d*\s*:\s*(.+)$/i);
        if (cover?.[1]) {
          mediaImg = cover[1].trim().replace(/[,)\]}]+$/, "");
          break;
        }
      }
    }
  }
  const fromImageLine = parseTikTokStillImageFromMedia(adMedia);
  const img =
    firstString(raw, ["previewUrl", "AD Preview", "Ad Preview", "thumbnail", "imageUrl"]) ??
    mediaImg ??
    fromImageLine ??
    deepFindTikTokImageUrl(raw) ??
    "";
  const adUrl =
    firstString(raw, ["adLibraryUrl", "Ad Detail URL", "ad_detail_url", "url"]) ??
    `https://library.tiktok.com/ads/detail/${encodeURIComponent(id)}`;

  const videoUrl =
    parseTikTokVideoUrlFromMedia(adMedia) ??
    firstString(raw, ["videoUrl", "video_url", "Video URL"]);

  const adDates = raw["Ad Dates"];
  const { first: firstRaw, last: lastRaw } = parseTikTokAdDates(adDates);
  const firstShown = firstRaw ? formatTikTokUiDate(firstRaw) : null;
  const lastShown = lastRaw ? formatTikTokUiDate(lastRaw) : null;
  const uniqueUsersSeen = pickTikTokAudience(raw) ?? null;

  return {
    id: String(id),
    headline,
    desc,
    url: adUrl.replace(/^https?:\/\//, "").slice(0, 56) || "tiktok.com",
    img,
    advertiser,
    adUrl,
    videoUrl: videoUrl || undefined,
    firstShown,
    lastShown,
    uniqueUsersSeen,
  };
}
