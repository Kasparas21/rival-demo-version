import type {
  FacebookAdLibraryItem,
  FacebookAdSnapshot,
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
  /** Link-unit headline under the domain (not primary text above the creative). */
  headline: string;
  /** Primary text above the creative (`snapshot.body.text`). */
  desc: string;
  cta: string;
  /** Legacy: landing URL or short display string; prefer `destinationUrl` for outbound links. */
  subtext: string;
  /** Normalized https URL for the CTA / hostname line when the library exposes a destination. */
  destinationUrl?: string;
  /** Grey description under the link headline (Meta link preview). */
  linkDescription?: string;
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
  /** Company logo from Ad Library when the actor provides it */
  advertiserLogoUrl?: string | null;
  /** CTA chip when available (e.g. "Learn more") */
  ctaLabel?: string | null;
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

/** Snapchat EU Ads Gallery — rows from Apify EU transparency-style actors. */
export type SnapchatAdCard = {
  id: string;
  headline: string;
  desc: string;
  url: string;
  img: string;
  videoUrl?: string | null;
  advertiser: string;
  adUrl: string;
  /** EU market where the row surfaced (ISO2) when present */
  euCountry?: string | null;
  impressionsLabel?: string | null;
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


/**
 * Converts common Apify / actor variants (camelCase keys, `{ url }` wrappers, nested `adsLibraryItem`)
 * into the snake_case `{ snapshot, ad_archive_id }` shape `facebookItemToMetaCard` expects.
 */
export function coerceFacebookDatasetRow(raw: unknown): FacebookAdLibraryItem {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const unwrap =
    typeof o.adsLibraryItem === "object" && o.adsLibraryItem !== null && !Array.isArray(o.adsLibraryItem)
      ? (o.adsLibraryItem as Record<string, unknown>)
      : null;

  /** Merge wrappers like `{ url }` payloads from alternate actors into a single record. */
  const baseObj: Record<string, unknown> =
    unwrap && typeof o.url !== "undefined" ? { ...o, ...unwrap } : unwrap ?? o;

  const pickStr = (...keys: string[]): string | undefined => {
    for (const k of keys) {
      const v = baseObj[k];
      if (typeof v === "string" && v.trim()) return v.trim();
      if (typeof v === "number" && Number.isFinite(v)) return String(Math.trunc(v));
    }
    return undefined;
  };

  let snapUnknown: unknown =
    baseObj.snapshot ?? baseObj.ad_snapshot ?? baseObjSnapshotFromActor(baseObj);

  if (typeof snapUnknown === "string") {
    try {
      snapUnknown = JSON.parse(snapUnknown) as unknown;
    } catch {
      snapUnknown = undefined;
    }
  }

  let snapshot =
    snapUnknown !== null &&
    typeof snapUnknown === "object" &&
    !Array.isArray(snapUnknown)
      ? (snapUnknown as FacebookAdSnapshot)
      : undefined;

  snapshot = augmentSnapshotFromFlattenedCreative(baseObj, snapshot);

  const impressions =
    typeof baseObj.impressions_with_index === "object" &&
    baseObj.impressions_with_index !== null &&
    !Array.isArray(baseObj.impressions_with_index)
      ? (baseObj.impressions_with_index as FacebookAdLibraryItem["impressions_with_index"])
      : typeof baseObj.impressionsWithIndex === "object" &&
          baseObj.impressionsWithIndex !== null &&
          !Array.isArray(baseObj.impressionsWithIndex)
        ? (baseObj.impressionsWithIndex as FacebookAdLibraryItem["impressions_with_index"])
        : undefined;

  return {
    ad_archive_id: pickStr("ad_archive_id", "adArchiveId", "archive_id", "adId", "id"),
    collation_id: pickStr("collation_id", "collationId"),
    page_id: pickStr("page_id", "pageId"),
    page_name: pickStr("page_name", "pageName"),
    start_date:
      typeof baseObj.start_date === "number"
        ? baseObj.start_date
        : typeof baseObj.startDate === "number"
          ? baseObj.startDate
          : undefined,
    end_date:
      typeof baseObj.end_date === "number"
        ? baseObj.end_date
        : typeof baseObj.endDate === "number"
          ? baseObj.endDate
          : undefined,
    snapshot,
    ad_library_url: pickStr("ad_library_url", "adLibraryUrl", "facebook_ad_library_url"),
    impressions_with_index: impressions,
  };
}

/** Some datasets nest the creative under uncommon keys — try shallow paths only. */
function baseObjSnapshotFromActor(baseObj: Record<string, unknown>): unknown {
  const direct = ["adCreative", "creative", "ad_creative"];
  for (const k of direct) {
    const v = baseObj[k];
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      const c = v as Record<string, unknown>;
      const looksLikeCreative =
        c.cards || c.images || c.videos || c.body !== undefined || c.title !== undefined;
      if (looksLikeCreative) return v;
    }
  }
  return undefined;
}

function augmentSnapshotFromFlattenedCreative(
  baseObj: Record<string, unknown>,
  snap: FacebookAdSnapshot | undefined
): FacebookAdSnapshot | undefined {
  const flatBody = flattenBodyTextFromBaseObj(baseObj);
  const orig =
    typeof baseObj.original_image_url === "string" && baseObj.original_image_url.trim()
      ? baseObj.original_image_url.trim()
      : typeof baseObj.originalImageUrl === "string" && baseObj.originalImageUrl.trim()
        ? baseObj.originalImageUrl.trim()
        : "";
  const resized =
    typeof baseObj.resized_image_url === "string" && baseObj.resized_image_url.trim()
      ? baseObj.resized_image_url.trim()
      : typeof baseObj.resizedImageUrl === "string" && baseObj.resizedImageUrl.trim()
        ? baseObj.resizedImageUrl.trim()
        : "";

  const titleFlat =
    typeof baseObj.title === "string"
      ? baseObj.title.trim()
      : typeof baseObj.headline === "string"
        ? baseObj.headline.trim()
        : "";

  if (snap) {
    const snapBodyExisting = cleanMetaText(snap.body?.text || "");
    const next: FacebookAdSnapshot = { ...snap };
    if (!snapBodyExisting && flatBody) {
      const t = cleanMetaText(flatBody);
      if (t) next.body = { ...(snap.body || {}), text: t };
    }
    return next;
  }

  const body = flatBody;
  const hasAny = Boolean(orig || resized || titleFlat || body);
  if (!hasAny) return undefined;

  return {
    title: titleFlat || undefined,
    caption: titleFlat || undefined,
    body: body ? { text: body } : undefined,
    ...(orig || resized
      ? { images: [{ original_image_url: orig || resized, resized_image_url: resized || orig }] }
      : {}),
  };
}

/** Pick the richest primary string actors stick on the row when `snapshot.body` is empty. */
function flattenBodyTextFromBaseObj(baseObj: Record<string, unknown>): string {
  const raw: string[] = [];
  if (typeof baseObj.body === "string" && baseObj.body.trim()) raw.push(baseObj.body.trim());
  if (typeof baseObj.description === "string" && baseObj.description.trim()) raw.push(baseObj.description.trim());
  for (const k of [
    "body_text",
    "bodyText",
    "primary_text",
    "primaryText",
    "ad_body",
    "adBody",
    "message",
    "text",
  ]) {
    const v = baseObj[k];
    if (typeof v === "string" && v.trim()) raw.push(v.trim());
  }
  const cleaned = raw.map((s) => cleanMetaText(s)).filter(Boolean);
  if (cleaned.length === 0) return "";
  return cleaned.reduce((best, cur) => (cur.length > best.length ? cur : best));
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

function facebookSnapshotString(snap: FacebookAdSnapshot | undefined, keys: string[]): string {
  if (!snap) return "";
  const o = snap as Record<string, unknown>;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string") {
      const t = cleanMetaText(v);
      if (t) return t;
    }
  }
  return "";
}

function facebookCardString(card: unknown, keys: string[]): string {
  if (!card || typeof card !== "object") return "";
  const o = card as Record<string, unknown>;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string") {
      const t = cleanMetaText(v);
      if (t) return t;
    }
  }
  return "";
}

/** Accept host or full URL strings from Ad Library snapshots. */
function metaDestinationHttps(raw: string): string | undefined {
  const t = raw.trim();
  if (!t || /\s/.test(t)) return undefined;
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/\/+/, "")}`;
  const href = safeHttpsUrl(withProto);
  return href || undefined;
}

/** Long / multi-clause strings belong in feed primary text, not the link headline slot. */
function looksLikeFbFeedPrimaryStory(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  const words = t.split(/\s+/).filter(Boolean).length;
  if (words >= 14) return true;
  if (t.length >= 90) return true;
  if (/\n/.test(t)) return true;
  // Scraped excerpts often end mid-sentence — still primary, not footer headline.
  if (/\.\.\.\s*$|…\s*$/.test(t)) return true;
  if (t.length >= 80 && (/[.!?]\s+[A-Za-zÀ-ÖØ-öø-ÿ]/.test(t) || /\s—\s/.test(t))) return true;
  return false;
}

function fbCaptionProbablyDisplayOnlyLabel(s: string): boolean {
  if (looksLikeFbFeedPrimaryStory(s)) return false;
  const t = s.trim();
  if (!t) return false;
  return t.split(/\s+/).filter(Boolean).length <= 12 && t.length <= 72;
}

function collectFbPrimaryBodyCandidates(snap: FacebookAdSnapshot | undefined): string[] {
  if (!snap) return [];
  const out: string[] = [];
  const push = (s: string) => {
    const t = cleanMetaText(s);
    if (t && !out.includes(t)) out.push(t);
  };

  push(snap.body?.text || "");

  const o = snap as Record<string, unknown>;
  for (const k of ["primary_text", "primaryText", "ad_body", "adBody", "message"]) {
    const v = o[k];
    if (typeof v === "string") push(v);
  }

  const bodiesArr = o.bodies;
  if (Array.isArray(bodiesArr)) {
    for (const item of bodiesArr) {
      if (typeof item === "string") push(item);
      else if (item && typeof item === "object") {
        const b = item as Record<string, unknown>;
        if (typeof b.text === "string") push(b.text);
        else if (typeof b.body === "string") push(b.body);
      }
    }
  }

  for (const c of snap.cards ?? []) {
    push(typeof c.body === "string" ? c.body : "");
  }

  return out;
}

function fbPickRichPrimaryCandidate(candidates: string[]): string {
  if (candidates.length === 0) return "";
  const scored = [...candidates].sort((a, b) => {
    const ap = looksLikeFbFeedPrimaryStory(a) ? 1 : 0;
    const bp = looksLikeFbFeedPrimaryStory(b) ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return b.length - a.length;
  });
  return scored[0] || "";
}

export function facebookItemToMetaCard(itemUnknown: unknown, index: number): MetaAdCard | null {
  const item = coerceFacebookDatasetRow(itemUnknown);
  const snap = item.snapshot;
  const card = snap?.cards?.[0];

  let primaryDesc = fbPickRichPrimaryCandidate(collectFbPrimaryBodyCandidates(snap));

  const linkHeadline = cleanMetaText(card?.title || "") || cleanMetaText(snap?.title || "");
  let captionRaw =
    facebookCardString(card, ["caption"]) || facebookSnapshotString(snap, ["caption"]);

  let linkDesc =
    facebookCardString(card, ["link_description", "linkDescription"]) ||
    facebookSnapshotString(snap, ["link_description", "linkDescription"]);

  /** Scrapers sometimes tuck primary copy under `caption` when `body` is empty — belongs above the creative. */
  if (!primaryDesc.trim() && captionRaw && looksLikeFbFeedPrimaryStory(captionRaw)) {
    primaryDesc = captionRaw;
    captionRaw = "";
  }

  /** Rare stale rows: prose only in link_description without a separate link title — treat as primary, not muted footer copy. */
  if (!primaryDesc.trim() && linkDesc && looksLikeFbFeedPrimaryStory(linkDesc) && !linkHeadline.trim()) {
    primaryDesc = linkDesc;
    linkDesc = "";
  }

  const desc = primaryDesc;

  let headline = linkHeadline;
  if (!headline && captionRaw.trim() && fbCaptionProbablyDisplayOnlyLabel(captionRaw)) {
    headline = captionRaw.trim();
  }

  /** Drop footer headline when it's the same copy as primary (scrapers confuse fields). */
  if (desc.trim() && headline.trim()) {
    const hn = headline.trim().toLowerCase();
    const pr = desc.trim().toLowerCase();
    const storyPrimary = looksLikeFbFeedPrimaryStory(desc);
    if (storyPrimary) {
      if (hn === pr || pr.startsWith(hn) || (/\.\.\.|…/.test(headline.trim()) && pr.startsWith(hn.replace(/\.\.\.|…$/g, "").trim()))) {
        headline = linkHeadline.trim();
      }
      if (!linkHeadline.trim() && (/\.\.\.|…/.test(headline) || looksLikeFbFeedPrimaryStory(headline))) {
        headline = "";
      }
    }
  }

  /** If muted link copy duplicates primary, omit from footer. */
  let linkDescOut = linkDesc.trim();
  if (linkDescOut && desc.trim() && desc.trim().startsWith(linkDescOut)) linkDescOut = "";
  else if (
    linkDescOut &&
    desc.trim() &&
    (linkDescOut === desc.trim() ||
      desc.trim().includes(linkDescOut) ||
      linkDescOut.includes(desc.trim()))
  ) {
    const shortOne = desc.length <= linkDescOut.length ? desc : linkDescOut;
    if (looksLikeFbFeedPrimaryStory(shortOne)) linkDescOut = "";
  }

  const pageName =
    snap?.page_name?.trim() ||
    snap?.current_page_name?.trim() ||
    item.page_name?.trim() ||
    "Sponsored";

  const ctaRaw =
    cleanMetaText(card?.cta_text || "") ||
    facebookSnapshotString(snap, ["cta_text", "ctaText"]) ||
    "Learn more";

  const { url: img, isVideo } = pickMetaImage(snap);
  const videoUrl = pickMetaVideoUrl(snap);

  const rawLinkUrl = typeof card?.link_url === "string" ? card.link_url.trim() : "";
  const rawSnapLink = typeof snap?.link_url === "string" ? snap.link_url.trim() : "";
  const linkMerged = rawLinkUrl || rawSnapLink;
  const captionDisplayRemainder = captionRaw.trim();

  /**
   * `subtext` drives hostname guessing: prefer outbound URL,
   * else a short caption (e.g. nordvpn.com) when we did not reuse it as primary.
   */
  const captionForHostname =
    !captionDisplayRemainder || captionDisplayRemainder === desc.trim() ? "" : captionDisplayRemainder;
  const subtext = linkMerged || captionForHostname || "";
  const destinationUrl = linkMerged ? metaDestinationHttps(linkMerged) : undefined;

  const id = item.ad_archive_id || item.collation_id || `fb-${index}`;
  const adLibraryUrl =
    item.ad_library_url?.trim() ||
    (item.ad_archive_id
      ? `https://www.facebook.com/ads/library/?id=${encodeURIComponent(item.ad_archive_id)}`
      : "https://www.facebook.com/ads/library/");
  const pic = snap?.page_profile_picture_url || undefined;
  const { url: probeImg } = pickMetaImage(snap);
  const hasRenderable =
    !!(item.ad_archive_id || item.collation_id || item.page_name?.trim() || snap || probeImg);
  if (!hasRenderable) return null;
  return {
    id: String(id),
    headline,
    desc,
    cta: ctaRaw === "No button" ? "Learn more" : ctaRaw,
    subtext,
    ...(destinationUrl ? { destinationUrl } : {}),
    ...(linkDescOut ? { linkDescription: linkDescOut } : {}),
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

/**
 * Bucket for Google Ads Transparency `format` strings — aligns with common Google Ads surfaces
 * (Search, Display, Video, Shopping, App, Discovery / Demand Gen, Performance Max).
 */
export type GoogleTransparencyFormatKind =
  | "text"
  | "image"
  | "video"
  | "shopping"
  | "app"
  | "discovery"
  | "performance_max"
  | "display"
  | "unknown";

export function googleCreativeFormatKind(format: string | undefined): GoogleTransparencyFormatKind {
  const raw = (format || "").trim();
  const f = raw.toLowerCase().replace(/[\s-]+/g, "_");
  if (!f) return "unknown";

  if (/(^|_)video($|_)|youtube|bumper|truview|in[-_]?stream|skippable/.test(f)) return "video";
  if (/shopping|product|merchant|feed/.test(f)) return "shopping";
  if (/^app($|_)|app_promotion|install|engagement/.test(f)) return "app";
  if (/discovery|demand_gen|gallery/.test(f)) return "discovery";
  if (/performance_max|^pmax/.test(f)) return "performance_max";
  if (/responsive_display|banner|rich_media|html5|expandable/.test(f)) return "display";
  if (/responsive_search|^text$|^search$|dsa/.test(f)) return "text";

  if (f === "image") return "image";
  if (f === "text") return "text";
  if (f === "video") return "video";

  return "unknown";
}

const FORMAT_KIND_LABELS: Record<GoogleTransparencyFormatKind, string> = {
  text: "Search / text",
  image: "Image",
  video: "Video",
  shopping: "Shopping",
  app: "App",
  discovery: "Discovery",
  performance_max: "Performance Max",
  display: "Display",
  unknown: "",
};

/** Human label for UI / summaries (tooltips, descriptions). */
export function googleCreativeFormatLabel(format: string | undefined): string | null {
  const raw = format?.trim();
  const kind = googleCreativeFormatKind(raw);
  if (kind !== "unknown") return FORMAT_KIND_LABELS[kind];
  return raw || null;
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
  const body = item.description?.trim() || "";
  const metaBits: string[] = [];
  if (item.adDuration?.trim()) metaBits.push(item.adDuration.trim());
  if (item.totalImpressions?.trim()) metaBits.push(`Impressions: ${item.totalImpressions.trim()}`);
  if (item.targeting && Object.keys(item.targeting).length > 0) {
    for (const [k, v] of Object.entries(item.targeting).slice(0, 6)) {
      if (v?.trim()) metaBits.push(`${k}: ${v.trim()}`);
    }
  }
  let desc = body;
  if (metaBits.length > 0) {
    desc = [body || null, ...metaBits].filter(Boolean).join("\n\n");
  }
  if (!desc.trim()) {
    desc = item.headline?.trim() || "—";
  }
  const headline =
    item.headline?.trim() ||
    item.adType?.replace(/_/g, " ").trim() ||
    "Sponsored";
  let img = item.image || item.poster || item.carouselImages?.[0] || "";
  const videoUrl = item.video?.trim();
  if (img && isLikelyLinkedInProfileOrAuthorPhoto(img)) {
    img = "";
  }
  const advLogo =
    typeof item.advertiserLogo === "string" && item.advertiserLogo.startsWith("http")
      ? item.advertiserLogo.trim()
      : undefined;
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
  const displayUrlHost =
    rawDest.replace(/^https?:\/\//, "").slice(0, 48) ||
    (item.advertiserLinkedinPage || "").replace(/^https?:\/\//, "").slice(0, 48) ||
    "linkedin.com";
  return {
    id: String(id),
    headline,
    desc,
    url: displayUrlHost,
    img,
    videoUrl: videoUrl || undefined,
    advertiserLogoUrl: advLogo || undefined,
    ctaLabel: item.cta?.trim() || undefined,
    advertiser: item.advertiser || item.poster || "Advertiser",
    adUrl,
  };
}

function looksLikeLinkedInDmsImageUrl(u: string): boolean {
  return /\.licdn\.com\/dms\/(image|gif|document)\//i.test(u);
}

/**
 * ivanvs/linkedin-ad-library-scraper varies field names; creatives often appear only as
 * `media.licdn.com/dms/image/...` strings without a `.jpg` suffix — stringify + walk the row.
 */
function gleanIvanVsLinkedInMedia(raw: Record<string, unknown>): { image?: string; video?: string } {
  const collected = new Set<string>();

  function addCandidate(s?: string | null) {
    const t = s?.trim();
    if (!t || !/^https?:\/\//i.test(t) || t.length > 4096) return;
    collected.add(t.trim());
  }

  function walk(val: unknown, depth: number) {
    if (depth > 10) return;
    if (typeof val === "string") {
      if (/^https?:\/\//i.test(val) && val.length < 4096) addCandidate(val);
      return;
    }
    if (!val || typeof val !== "object") return;
    if (Array.isArray(val)) {
      for (const x of val) walk(x, depth + 1);
      return;
    }
    const o = val as Record<string, unknown>;
    for (const v of Object.values(o)) walk(v, depth + 1);
  }

  for (const k of [
    "imageUrl",
    "ImageUrl",
    "image",
    "Image",
    "thumbnailUrl",
    "thumbnail",
    "ThumbnailUrl",
    "posterUrl",
    "posterImageUrl",
    "previewImageUrl",
    "creativeImageUrl",
    "poster",
  ] as const) {
    const v = raw[k];
    if (typeof v === "string") addCandidate(v);
  }

  walk(raw.carousel, 0);
  walk(raw.carouselItems, 0);
  walk(raw.images, 0);
  walk(raw.cards, 0);
  walk(raw.media, 0);

  walk(raw, 0);

  let blob = "";
  try {
    blob = JSON.stringify(raw);
  } catch {
    blob = "";
  }

  if (blob) {
    const stripTail = (u: string) => u.replace(/[)\]},.;]+$/g, "");
    const licdnRe = /https?:\/\/[a-z0-9.-]*\.?licdn\.com[^"'\\s<>]+/gi;
    let lm: RegExpExecArray | null;
    licdnRe.lastIndex = 0;
    while ((lm = licdnRe.exec(blob)) !== null) {
      addCandidate(stripTail(lm[0]));
    }

    const videoRe = /https?:\/\/[^"'\\s<>]+\.(?:mp4|webm)(?:\?[^"'\\s<>]*)?/gi;
    videoRe.lastIndex = 0;
    let vm: RegExpExecArray | null;
    while ((vm = videoRe.exec(blob)) !== null) {
      addCandidate(stripTail(vm[0]));
    }

    const m3uRe = /https?:\/\/[^"'\\s<>]+\.(?:m3u8)(?:\?[^"'\\s<>]*)?/gi;
    m3uRe.lastIndex = 0;
    let xm: RegExpExecArray | null;
    while ((xm = m3uRe.exec(blob)) !== null) {
      addCandidate(stripTail(xm[0]));
    }
  }

  const videoCandidates = [...collected].filter((u) => looksLikeVideoFileUrl(u));
  const video = videoCandidates[0];

  const imageCandidates = [...collected].filter(
    (u) => !looksLikeVideoFileUrl(u) && !isLikelyLinkedInProfileOrAuthorPhoto(u)
  );

  const licdnCreatives = imageCandidates.filter((u) => looksLikeLinkedInDmsImageUrl(u));
  const extImage = imageCandidates.filter(
    (u) =>
      /\.(png|jpe?g|gif|webp|avif)(\?|#|$)/i.test(u) ||
      /\/dms\/(image|gif)\//i.test(u)
  );

  const image =
    licdnCreatives.find((u) => /image-shrink|\/dms\/image\/v\d\//i.test(u)) ||
    licdnCreatives.find((u) => /feedshare-shrink|creative|ad-|ads-/i.test(u)) ||
    licdnCreatives[0] ||
    extImage[0] ||
    imageCandidates[0];

  return { image, video };
}

function isIvanVsLinkedInDatasetItem(raw: Record<string, unknown>): boolean {
  const url = typeof raw.url === "string" ? raw.url : "";
  return (
    raw.id !== undefined &&
    raw.id !== null &&
    typeof raw.url === "string" &&
    url.includes("linkedin.com/ad-library/detail")
  );
}

/** data_xplorer/linkedin-ad-library-scraper — `adUrl` / `adImage` / structured copy fields */
function isDataXplorerLinkedInDatasetItem(raw: Record<string, unknown>): boolean {
  if (typeof raw.adUrl === "string" && raw.adUrl.includes("linkedin.com/ad-library/detail"))
    return true;
  const img = typeof raw.adImage === "string" ? raw.adImage.trim() : "";
  if (img && /^https?:\/\//i.test(img)) return true;
  if (typeof raw.adDescription === "string" && typeof raw.advertiserName === "string") {
    if (typeof raw.adPaidBy === "string" || Array.isArray(raw["Publication Date"])) return true;
    if (
      typeof raw.adLinkUrl === "string" ||
      typeof raw.adTotalImpressions === "string" ||
      raw.adTargetingAudience !== undefined
    ) {
      return true;
    }
  }
  return false;
}

/** Map ivanvs/linkedin-ad-library-scraper dataset rows → legacy item. */
function linkedInIvanVsApifyItemToLegacyItem(raw: Record<string, unknown>, index: number): LinkedInAdItem {
  const id = raw.id != null ? String(raw.id) : `li-${index}`;
  const adv =
    raw.advertiser !== null && typeof raw.advertiser === "object"
      ? (raw.advertiser as Record<string, unknown>)
      : undefined;
  const advName =
    typeof adv?.name === "string" && adv.name.trim()
      ? adv.name.trim()
      : typeof raw.paidBy === "string"
        ? raw.paidBy.replace(/^Paid for by\s+/i, "").trim()
        : undefined;
  const advUrl = typeof adv?.url === "string" ? adv.url.trim() : undefined;
  const advLogo =
    typeof adv?.logo === "string" && adv.logo.startsWith("http") ? adv.logo.trim() : undefined;
  const period = raw.period as { start?: string; end?: string } | undefined;
  const start = typeof period?.start === "string" ? period.start : undefined;
  const end = typeof period?.end === "string" ? period.end : undefined;
  const adDuration = start && end ? `${start} → ${end}` : start ?? (end ?? undefined);

  let targeting: Record<string, string> | undefined;
  if (Array.isArray(raw.targetingSettings)) {
    targeting = {};
    for (const row of raw.targetingSettings as unknown[]) {
      if (!row || typeof row !== "object") continue;
      const t = row as Record<string, unknown>;
      const tk = typeof t.target === "string" ? t.target : "Targeting";
      const tv = typeof t.value === "string" ? t.value.trim() : "";
      if (tv) targeting[tk] = tv;
    }
    if (Object.keys(targeting).length === 0) targeting = undefined;
  }

  const fmt = typeof raw.format === "string" ? raw.format.toUpperCase() : "";
  const imageUrl = typeof raw.imageUrl === "string" ? raw.imageUrl.trim() : undefined;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const bod = typeof raw.body === "string" ? raw.body.trim() : "";

  const headlineFromFormat = fmt
    ? fmt
        .split("_")
        .filter(Boolean)
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(" ")
    : undefined;

  let videoDirect: string | undefined;
  for (const k of [
    "videoUrl",
    "VideoUrl",
    "video",
    "transcodedVideoUrl",
    "mp4Url",
    "mediaVideoUrl",
    "mediaUrl",
    "MediaUrl",
  ] as const) {
    const v = raw[k];
    if (typeof v === "string" && v.trim()) {
      const t = v.trim();
      if (looksLikeVideoFileUrl(t)) {
        videoDirect = t;
        break;
      }
      if (!videoDirect && /\.(mp4|webm|m3u8)/i.test(t)) videoDirect = t;
    }
  }

  let video: string | undefined;
  let image: string | undefined;
  if (fmt.includes("VIDEO")) {
    video = videoDirect;
    image = imageUrl && !looksLikeVideoFileUrl(imageUrl) ? imageUrl : undefined;
    if (!video && imageUrl && looksLikeVideoFileUrl(imageUrl)) {
      video = imageUrl;
      image = undefined;
    }
  } else if (looksLikeVideoFileUrl(imageUrl || "")) {
    video = imageUrl;
  } else {
    image = imageUrl;
  }

  const glean = gleanIvanVsLinkedInMedia(raw);
  if (!video && glean.video) video = glean.video;
  if (!image && glean.image) image = glean.image;
  if (advLogo && image === advLogo) image = undefined;

  const cta =
    Array.isArray(raw.buttons) && raw.buttons.length > 0
      ? typeof raw.buttons[0] === "string"
        ? raw.buttons[0]
        : String(raw.buttons[0])
      : undefined;

  return {
    id,
    headline: title || headlineFromFormat || undefined,
    description: bod || undefined,
    image: image && !looksLikeVideoFileUrl(image) ? image : undefined,
    video,
    advertiser: advName,
    advertiserLogo: advLogo || undefined,
    advertiserLinkedinPage: advUrl,
    adDetailUrl: typeof raw.url === "string" ? raw.url : undefined,
    destinationUrl: advUrl || undefined,
    cta,
    adType: typeof raw.format === "string" ? raw.format : undefined,
    adDuration,
    startDate: start,
    endDate: end,
    totalImpressions: typeof raw.totalImpression === "string" ? raw.totalImpression : undefined,
    targeting,
  };
}

/** Map data_xplorer/linkedin-ad-library-scraper dataset rows → legacy item (`adImage` = creative). */
function linkedInDataXplorerApifyItemToLegacyItem(raw: Record<string, unknown>, index: number): LinkedInAdItem {
  const id = raw.id != null ? String(raw.id) : `li-${index}`;
  const adImage = typeof raw.adImage === "string" ? raw.adImage.trim() : "";

  let video: string | undefined;
  let image: string | undefined;
  if (looksLikeVideoFileUrl(adImage)) {
    video = adImage;
  } else if (adImage && /^https?:\/\//i.test(adImage)) {
    image = adImage;
  }

  let targeting: Record<string, string> | undefined;
  if (Array.isArray(raw.adTargetingAudience)) {
    targeting = {};
    for (const row of raw.adTargetingAudience as unknown[]) {
      if (!row || typeof row !== "object") continue;
      const t = row as Record<string, unknown>;
      const tk = typeof t.type === "string" ? t.type.trim() || "Targeting" : "Targeting";
      const tv = typeof t.value === "string" ? t.value.trim() : "";
      if (!tv) continue;
      const st = typeof t.status === "string" ? t.status.trim() : "";
      targeting[tk] = st ? `${tv} (${st})` : tv;
    }
    if (Object.keys(targeting).length === 0) targeting = undefined;
  }

  const pubUnknown = raw["Publication Date"];
  let startPub: string | undefined;
  let endPub: string | undefined;
  if (Array.isArray(pubUnknown)) {
    for (const p of pubUnknown) {
      if (!p || typeof p !== "object") continue;
      const o = p as Record<string, unknown>;
      if (typeof o.start === "string" && o.start.trim()) startPub = o.start.trim();
      if (typeof o.end === "string" && o.end.trim()) endPub = o.end.trim();
    }
  }
  const adDuration =
    startPub && endPub ? `${startPub} → ${endPub}` : startPub ?? (endPub ?? undefined);

  const desc = typeof raw.adDescription === "string" ? raw.adDescription.trim() : "";
  const firstLine = desc.split(/\r?\n/).find((l) => l.trim()) ?? "";
  const headlineLine = firstLine.trim().slice(0, 160);
  const paidBy =
    typeof raw.adPaidBy === "string" && raw.adPaidBy.trim() ? raw.adPaidBy.trim() : undefined;

  const advLogo =
    typeof raw.advertiserLogo === "string" && raw.advertiserLogo.startsWith("http")
      ? raw.advertiserLogo.trim()
      : undefined;

  if (advLogo && image === advLogo) image = undefined;

  const descriptionParts = [desc, paidBy ? `Paid for by ${paidBy}` : ""].filter(
    (s): s is string => typeof s === "string" && s.trim().length > 0
  );

  return {
    id,
    headline: headlineLine || (typeof raw.adType === "string" ? raw.adType.trim() : undefined),
    description: descriptionParts.length ? descriptionParts.join("\n\n") : undefined,
    image,
    video,
    advertiser: typeof raw.advertiserName === "string" ? raw.advertiserName.trim() : undefined,
    advertiserLogo: advLogo,
    adDetailUrl: typeof raw.adUrl === "string" ? raw.adUrl.trim() : undefined,
    destinationUrl: typeof raw.adLinkUrl === "string" ? raw.adLinkUrl.trim() : undefined,
    adType: typeof raw.adType === "string" ? raw.adType.trim() : undefined,
    adDuration,
    totalImpressions: typeof raw.adTotalImpressions === "string" ? raw.adTotalImpressions : undefined,
    targeting,
  };
}

/** One more deep pass: ivanvs + other actors bury creatives under odd keys — glean always wins filling gaps. */
function mergeLinkedInItemWithRawMediaGlean(raw: Record<string, unknown>, item: LinkedInAdItem): LinkedInAdItem {
  const g = gleanIvanVsLinkedInMedia(raw);
  const fromPoster = typeof item.poster === "string" ? item.poster.trim() : "";
  const fromCarousel =
    item.carouselImages?.find((x) => typeof x === "string" && x.trim())?.trim() ?? "";
  const fromImage = item.image?.trim() ?? "";
  let image: string | undefined = fromImage || fromPoster || fromCarousel || undefined;
  let video: string | undefined = item.video?.trim() || undefined;
  const advLogo = item.advertiserLogo?.trim();

  if (!video && g.video) video = g.video.trim();
  if (image && isLikelyLinkedInProfileOrAuthorPhoto(image)) image = undefined;
  if ((!image || looksLikeVideoFileUrl(image)) && g.image && !looksLikeVideoFileUrl(g.image)) {
    image = g.image.trim();
  }
  if (image && isLikelyLinkedInProfileOrAuthorPhoto(image)) image = undefined;
  if (advLogo && image === advLogo) image = undefined;
  if (
    video &&
    !image &&
    g.image &&
    !looksLikeVideoFileUrl(g.image) &&
    !isLikelyLinkedInProfileOrAuthorPhoto(g.image) &&
    g.image.trim() !== advLogo
  ) {
    image = g.image.trim();
  }

  return { ...item, image, video };
}

/** Map Apify LinkedIn dataset rows → legacy item. */
export function linkedInApifyItemToLegacyItem(raw: Record<string, unknown>, index: number): LinkedInAdItem {
  if (isIvanVsLinkedInDatasetItem(raw)) {
    return mergeLinkedInItemWithRawMediaGlean(raw, linkedInIvanVsApifyItemToLegacyItem(raw, index));
  }
  if (isDataXplorerLinkedInDatasetItem(raw)) {
    return mergeLinkedInItemWithRawMediaGlean(raw, linkedInDataXplorerApifyItemToLegacyItem(raw, index));
  }
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
    return mergeLinkedInItemWithRawMediaGlean(raw, {
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
    });
  }

  const content = raw.content as
    | { body?: string; headline?: string; ctaText?: string }
    | undefined;
  const media = Array.isArray(raw.media) ? raw.media : [];
  const fromArr = media.length ? extractLinkedInMediaFromArray(media as unknown[]) : { image: undefined, video: undefined };
  const adId = raw.adId ?? raw.id;

  return mergeLinkedInItemWithRawMediaGlean(raw, {
    id: adId != null ? String(adId) : `li-${index}`,
    description: content?.body ?? undefined,
    headline: content?.headline ?? undefined,
    image: fromArr.image,
    video: fromArr.video,
    advertiser: typeof raw.advertiserName === "string" ? raw.advertiserName : undefined,
    destinationUrl: typeof raw.externalLink === "string" ? raw.externalLink : undefined,
    cta: typeof content?.ctaText === "string" ? content.ctaText : undefined,
  });
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

/** Map Snapchat EU gallery dataset row → card (field names vary across actor versions). */
export function snapchatDatasetItemToCard(raw: Record<string, unknown>, index: number): SnapchatAdCard {
  const sid =
    firstString(raw, ["adId", "ad_id", "adID", "id", "snapAdId", "adLibraryId", "uuid"]) || "";
  const id = sid ? String(sid) : `snap-${index}`;

  const headline =
    firstString(raw, ["headline", "title", "adTitle", "name", "brandName"]) || "Snapchat ad";

  const advertiser =
    firstString(raw, ["advertiser", "advertiserName", "brandName", "companyName"]) || "Advertiser";

  let videoUrl =
    firstString(raw, ["videoUrl", "video_url", "mediaUrl", "creativeVideoUrl"]) || "";
  let img =
    firstString(raw, [
      "imageUrl",
      "thumbnailUrl",
      "posterUrl",
      "previewUrl",
      "creativeImageUrl",
      "thumbnail",
      "image",
    ]) || "";

  if (img && looksLikeVideoFileUrl(img)) {
    if (!videoUrl) videoUrl = img;
    img = "";
  }

  const descParts: string[] = [];
  const status = firstString(raw, ["status", "deliveryStatus"]);
  if (status) descParts.push(status);
  const paid = raw.paidReach ?? raw.paid_impressions ?? raw.estimatedAudience;
  if (typeof paid === "string" && paid.trim()) descParts.push(paid.trim());
  const desc =
    descParts.length > 0 ? descParts.join(" · ") : firstString(raw, ["body", "description"]) || "—";

  const landing =
    firstString(raw, ["destinationUrl", "landingUrl", "websiteUrl", "callToActionUrl", "ctaUrl"]) || "";
  const urlHost =
    landing.replace(/^https?:\/\//, "").split("/")[0]?.slice(0, 48) ||
    advertiser.slice(0, 48).toLowerCase() ||
    "snapchat.com";

  const adUrl =
    safeHttpsUrl(firstString(raw, ["adPreviewUrl", "previewUrlFull", "adUrl", "url"]) ?? "") ||
    safeHttpsUrl(landing) ||
    "https://www.snapchat.com/ads/about";

  const euCountry = firstString(raw, ["country", "countryCode", "market"]);

  let impressionsLabel: string | null = null;
  const im =
    typeof raw.impressions === "number"
      ? String(raw.impressions)
      : firstString(raw, ["impressions", "estimatedImpressions", "estimated_impressions"]);
  if (im) impressionsLabel = im;

  return {
    id,
    headline,
    desc,
    url: urlHost,
    img,
    videoUrl: videoUrl || undefined,
    advertiser,
    adUrl,
    euCountry,
    impressionsLabel,
  };
}
