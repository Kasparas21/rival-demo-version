import type {
  FacebookAdLibraryItem,
  FacebookAdSnapshot,
  GoogleCompanyAdItem,
  LinkedInAdItem,
} from "@/lib/ad-library/apify-raw-types";
import {
  cleanDomainHost,
  effectiveCompetitorBrandLabel,
  junkUserBrandDisplayName,
} from "@/lib/ad-library/competitor-brand-display";

/** Meta serves most Ad Library MP4s from FB domains; they rarely play in our `<video>` (black player). */
export function isMetaLibraryVideoStreamUrl(url: string | undefined): boolean {
  const u = url?.trim().toLowerCase() ?? "";
  if (!u) return false;
  return (
    u.includes("fbcdn.net") ||
    u.includes("facebook.com") ||
    u.includes("fb.com/") ||
    u.includes("fb.watch")
  );
}

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
  /** True when scraped page_id does not match the user-confirmed Meta page id */
  advertiserMismatch?: boolean;
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
      /** Resolved 11-char YouTube id when found in the scraper payload (poster fallbacks). */
      youtubeVideoId?: string | null;
      /** Direct creative video URL (e.g. MP4) when available — used for first-frame preview in the app. */
      videoUrl?: string | null;
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
  advertiserMismatch?: boolean;
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
  advertiserMismatch?: boolean;
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

/** One row from Pinterest transparency `targeting` (shown as label + value). */
export type PinterestTargetingRow = {
  label: string;
  value: string;
};

/** Pinterest Ad Transparency (DSA regions) — Apify zadexinho/pinterest-ads-scraper */
export type PinterestAdCard = {
  id: string;
  headline: string;
  /** Compact text summary (strategy / comparisons); mirrors structured targeting when available. */
  desc: string;
  url: string;
  img: string;
  /** Pin / ad video file when exposed by the actor (MP4/HLS) */
  videoUrl?: string | null;
  advertiser: string;
  adUrl: string;
  /** Structured targeting breakdown for display (ages, geo, keywords, extras from API). */
  targetingRows?: PinterestTargetingRow[];
  /** e.g. from reach.totalEU */
  reachSummary?: string | null;
  /** Impressions or similar disclosure when scraped */
  impressionsLabel?: string | null;
  /** Human-readable disclosure / flight window when dates exist on the row */
  disclosureWindow?: string | null;
  advertiserMismatch?: boolean;
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
  advertiserMismatch?: boolean;
  /** Raw status e.g. ACTIVE — drives gallery-style badge */
  status?: string | null;
  brandAdvertised?: string | null;
  startDateLabel?: string | null;
  endDateLabel?: string | null;
  ctaLabel?: string | null;
  /** When true, omit headline overlay under creative (duplicate / Snapchat template noise). */
  suppressCreativeHeadline?: boolean;
  /** Actor row had a non-empty `mediaUrl` / `MediaUrl` (EU gallery hero asset). */
  hasHeroMediaUrl?: boolean;
};

const GENERIC_ADVERTISER_PLACEHOLDER = /^advertiser$/i;

function normalizeBrandAdvertiserString(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** True when normalized advertiser string doesn’t match any expected competitor label (name + domain hints). */
function brandAdvertiserNameMismatchForCard(
  brandName: string,
  advertiserNameFromPayload: string,
  domainHint?: string
): boolean {
  const candidates: string[] = [];
  const bn = brandName.trim();
  if (bn && !junkUserBrandDisplayName(bn)) candidates.push(bn);
  const host = cleanDomainHost(domainHint);
  if (host) {
    candidates.push(effectiveCompetitorBrandLabel(undefined, host));
    const seg = host.split(".")[0];
    if (seg) candidates.push(seg);
  }
  const normalizedKeys = [...new Set(candidates.map(normalizeBrandAdvertiserString).filter(Boolean))];

  const a = normalizeBrandAdvertiserString(advertiserNameFromPayload);
  if (!a) return false;
  if (GENERIC_ADVERTISER_PLACEHOLDER.test(advertiserNameFromPayload.trim())) return false;
  if (normalizedKeys.length === 0) return false;

  for (const c of normalizedKeys) {
    if (a === c || a.includes(c) || c.includes(a)) return false;
  }
  return true;
}

function linkedInAdvertiserCompanyIdFromDatasetRow(raw: Record<string, unknown>): string | undefined {
  const pick = (v: unknown): string | undefined => {
    if (typeof v === "number" && Number.isFinite(v)) return String(Math.trunc(v));
    if (typeof v === "string" && v.trim()) return v.trim();
    return undefined;
  };

  const fromTop = pick(raw.advertiserCompanyId ?? raw.companyId ?? raw.company_id ?? raw.organizationId ?? raw.organization_id);
  if (fromTop) return fromTop;

  const adv = raw.advertiser;
  if (adv && typeof adv === "object" && !Array.isArray(adv)) {
    const o = adv as Record<string, unknown>;
    const id = pick(o.id ?? o.companyId ?? o.company_id ?? o.companyID);
    if (id) return id;
  }

  return undefined;
}

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
  const row = raw as Record<string, unknown>;
  /** Crawlee / Apify dataset rows often store the payload under `json`. */
  const nestedJson = row.json;
  let o: Record<string, unknown>;
  if (nestedJson && typeof nestedJson === "object" && !Array.isArray(nestedJson)) {
    const inner = nestedJson as Record<string, unknown>;
    const { json: _omitJson, ...rest } = row;
    o = { ...inner, ...rest };
  } else {
    o = row;
  }
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

function snapshotHasRenderableCreative(s: FacebookAdSnapshot): boolean {
  const c = s.cards?.[0];
  if (
    c &&
    (c.original_image_url ||
      c.resized_image_url ||
      c.video_preview_image_url ||
      c.video_hd_url ||
      c.video_sd_url)
  ) {
    return true;
  }
  const img0 = s.images?.[0];
  if (img0 && (img0.original_image_url || img0.resized_image_url)) return true;
  const v0 = s.videos?.[0];
  if (v0 && (v0.video_preview_image_url || v0.video_hd_url || v0.video_sd_url)) return true;
  const rec = s as Record<string, unknown>;
  if (typeof rec.image_url === "string" && rec.image_url.trim()) return true;
  if (typeof rec.imageUrl === "string" && rec.imageUrl.trim()) return true;
  return false;
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

  const anyTopImage =
    (typeof baseObj.image_url === "string" ? baseObj.image_url.trim() : "") ||
    (typeof baseObj.imageUrl === "string" ? baseObj.imageUrl.trim() : "") ||
    (typeof baseObj.thumbnail_url === "string" ? baseObj.thumbnail_url.trim() : "") ||
    (typeof baseObj.thumbnailUrl === "string" ? baseObj.thumbnailUrl.trim() : "") ||
    (typeof baseObj.creative_image_url === "string" ? baseObj.creative_image_url.trim() : "") ||
    (typeof baseObj.creativeImageUrl === "string" ? baseObj.creativeImageUrl.trim() : "") ||
    (typeof baseObj.media_url === "string" ? baseObj.media_url.trim() : "") ||
    (typeof baseObj.mediaUrl === "string" ? baseObj.mediaUrl.trim() : "") ||
    "";

  const flatCreativeUrl = orig || resized || anyTopImage;

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
    if (!snapshotHasRenderableCreative(next) && flatCreativeUrl) {
      next.images = [{ original_image_url: flatCreativeUrl, resized_image_url: flatCreativeUrl }];
    }
    const snapRec = next as Record<string, unknown>;
    const snapOnlyImage =
      (typeof snapRec.image_url === "string" ? snapRec.image_url.trim() : "") ||
      (typeof snapRec.imageUrl === "string" ? snapRec.imageUrl.trim() : "") ||
      "";
    if (!snapshotHasRenderableCreative(next) && snapOnlyImage) {
      next.images = [{ original_image_url: snapOnlyImage, resized_image_url: snapOnlyImage }];
    }
    const topPic =
      firstStringFromRecord(baseObj, [
        "page_profile_picture_url",
        "pageProfilePictureUrl",
        "profile_picture_url",
        "profilePictureUrl",
        "page_picture_url",
        "pagePictureUrl",
        "picture",
      ]) ||
      (typeof snapRec.page_profile_picture_url === "string" ? snapRec.page_profile_picture_url.trim() : "");
    if (topPic && !next.page_profile_picture_url) {
      next.page_profile_picture_url = topPic;
    }
    return next;
  }

  const body = flatBody;
  const hasAny = Boolean(flatCreativeUrl || titleFlat || body);
  if (!hasAny) return undefined;

  return {
    title: titleFlat || undefined,
    caption: titleFlat || undefined,
    body: body ? { text: body } : undefined,
    ...(flatCreativeUrl
      ? { images: [{ original_image_url: flatCreativeUrl, resized_image_url: flatCreativeUrl }] }
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

function firstStringFromRecord(o: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickMetaImage(snap: FacebookAdLibraryItem["snapshot"]): { url: string; isVideo: boolean } {
  if (!snap) return { url: "", isVideo: false };
  const snapLoose = snap as Record<string, unknown>;
  const directStill = firstStringFromRecord(snapLoose, [
    "image_url",
    "imageUrl",
    "picture",
    "full_picture",
    "fullPicture",
  ]);
  if (directStill) return { url: directStill, isVideo: false };

  const fmt = (snap.display_format || "").toUpperCase();

  for (const rawCard of snap.cards ?? []) {
    const cardLoose = rawCard as Record<string, unknown>;
    const looseStill = firstStringFromRecord(cardLoose, [
      "image_url",
      "imageUrl",
      "image_uri",
      "imageUri",
      "link_image",
      "linkImage",
      "picture",
      "full_picture",
      "thumbnail_uri",
      "thumbnailUri",
    ]);
    if (looseStill) return { url: looseStill, isVideo: false };

    const c = rawCard as NonNullable<FacebookAdSnapshot["cards"]>[number];
    if (c?.video_preview_image_url) {
      return { url: c.video_preview_image_url, isVideo: true };
    }
    if (c?.video_hd_url || c?.video_sd_url) {
      return { url: c.video_preview_image_url || "", isVideo: true };
    }
    const cardImage = c?.resized_image_url || c?.original_image_url || "";
    if (cardImage) {
      return { url: cardImage, isVideo: false };
    }
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
  for (const card of snap.cards ?? []) {
    const fromCard = card?.video_hd_url || card?.video_sd_url;
    if (fromCard) return fromCard;
  }
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

export function facebookItemToMetaCard(
  itemUnknown: unknown,
  index: number,
  ctx?: { confirmedPageId?: string }
): MetaAdCard | null {
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

  const confirmedNorm = ctx?.confirmedPageId?.replace(/\D/g, "") ?? "";
  const pageIdNorm = item.page_id?.replace(/\D/g, "") ?? "";
  const advertiserMismatch =
    Boolean(confirmedNorm) && Boolean(pageIdNorm) && pageIdNorm !== confirmedNorm;

  return {
    id: String(id),
    headline,
    desc,
    cta: ctaRaw === "No button" ? "Learn more" : ctaRaw,
    subtext,
    ...(destinationUrl ? { destinationUrl } : {}),
    ...(linkDescOut ? { linkDescription: linkDescOut } : {}),
    img: img || "",
    isVideo,
    adLibraryUrl,
    startedAt: item.start_date,
    endedAt: item.end_date,
    impressionsIndex: item.impressions_with_index?.impressions_index,
    pageName,
    pageProfilePic: pic,
    ...(videoUrl ? { videoUrl } : {}),
    ...(advertiserMismatch ? { advertiserMismatch: true } : {}),
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

/**
 * Google Transparency “preview” links are often HTML/JS loaders (`…/ads/preview/content.js?…`), not raster images.
 * Those must not be passed to `<img src>` — use `videoUrl` / playable URLs instead.
 */
export function isGoogleTransparencyScriptPreviewUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  if (u.includes("/ads/preview/content.js")) return true;
  if (u.includes("content.js?") || u.endsWith("content.js")) return true;
  return false;
}

/** Suitable for `<img src>` on Google / YouTube ad cards (excludes script loaders and video streams). */
export function isUsableGoogleStillImagePreviewUrl(url: string): boolean {
  const t = url.trim();
  if (!t || !/^https?:\/\//i.test(t)) return false;
  if (isGoogleTransparencyScriptPreviewUrl(t)) return false;
  if (/googlevideo\.com\/videoplayback/i.test(t)) return false;
  if (/\.(mp4|webm|m3u8)(\?|$)/i.test(t)) return false;
  return true;
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

function extractFirstYouTubeVideoIdDeep(obj: unknown, depth = 0): string | null {
  if (depth > 10 || obj === null || obj === undefined) return null;
  if (typeof obj === "string") {
    return extractYouTubeVideoId(obj);
  }
  if (Array.isArray(obj)) {
    for (const x of obj) {
      const id = extractFirstYouTubeVideoIdDeep(x, depth + 1);
      if (id) return id;
    }
    return null;
  }
  if (typeof obj === "object") {
    for (const v of Object.values(obj)) {
      const id = extractFirstYouTubeVideoIdDeep(v, depth + 1);
      if (id) return id;
    }
  }
  return null;
}

/** MP4/WebM (or googlevideo.com) URLs — playable in `<video>` for a first-frame preview. */
function findFirstGoogleVideoFileUrl(obj: unknown, depth = 0): string | null {
  if (depth > 8 || obj === null || obj === undefined) return null;
  if (typeof obj === "string") {
    const s = obj.trim();
    if (!/^https?:\/\//i.test(s) || s.length < 12) return null;
    if (/\.(mp4|webm)(\?|$)/i.test(s)) return s;
    if (/googlevideo\.com\/videoplayback\?/i.test(s)) return s;
    if (/googlevideo\.com\//i.test(s) && (/videoplayback|\.mp4|\.webm/i.test(s))) return s;
    return null;
  }
  if (Array.isArray(obj)) {
    for (const x of obj) {
      const u = findFirstGoogleVideoFileUrl(x, depth + 1);
      if (u) return u;
    }
    return null;
  }
  if (typeof obj === "object") {
    for (const v of Object.values(obj)) {
      const u = findFirstGoogleVideoFileUrl(v, depth + 1);
      if (u) return u;
    }
  }
  return null;
}

export function youtubePosterUrlFromVideoId(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId.trim()}/hqdefault.jpg`;
}

/** Multiple static thumbnail URLs — hqdefault 404s on some shorts/unlisted; fall back through qualities. */
export function youtubePosterCandidateUrls(videoId: string): string[] {
  const id = videoId.trim();
  if (!id) return [];
  return (["hqdefault", "mqdefault", "sddefault", "default"] as const).map(
    (q) => `https://img.youtube.com/vi/${id}/${q}.jpg`
  );
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
    ) {
      return isUsableGoogleStillImagePreviewUrl(s) ? s : null;
    }
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
      if (typeof v === "string" && v.trim()) {
        const t = v.trim();
        if (isUsableGoogleStillImagePreviewUrl(t)) return t;
      }
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
    adUrl: pick([
      "adUrl",
      "ad_url",
      "adLibraryUrl",
      "ad_library_url",
      "url",
      "transparencyUrl",
      "transparency_url",
      "permalink",
    ]),
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
    youtubeVideoId: extractFirstYouTubeVideoIdDeep(o) ?? null,
    creativeVideoUrl:
      pick(["videoUrl", "video_url", "videoURL", "creativeVideoUrl", "creative_video_url"]) ||
      (() => {
        const va = o.videoUrls;
        if (!Array.isArray(va)) return undefined;
        const first = va.find((x): x is string => typeof x === "string" && x.trim().length > 0);
        return first?.trim();
      })() ||
      findFirstGoogleVideoFileUrl(o) ||
      null,
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
  const fromHeadline =
    item.headline?.trim() || item.title?.trim() || item.description?.trim()?.slice(0, 120);

  /** YouTube-style card: any video creative kind, Transparency links, or a resolved YouTube id / video file. */
  const useYoutubeCard =
    googleCreativeFormatKind(item.format) === "video" ||
    /youtube\.com|youtu\.be/i.test(adUrl) ||
    Boolean(item.youtubeVideoId?.trim()) ||
    Boolean(item.creativeVideoUrl?.trim());

  if (useYoutubeCard) {
    const title =
      fromHeadline ||
      (item.advertiserName && displayDomain
        ? `${item.advertiserName} — ${displayDomain}`
        : item.advertiserName || displayDomain || (creativeId ? `Video ad (${creativeId})` : "Video ad"));
    const pu = item.previewUrl?.trim() || "";
    const iu = item.imageUrl?.trim() || "";
    const nestedRaw = findFirstGoogleCreativeImageUrl(item as unknown);
    const nested =
      nestedRaw &&
      !isGoogleFaviconUrl(nestedRaw) &&
      isUsableGoogleStillImagePreviewUrl(nestedRaw)
        ? nestedRaw
        : null;
    let yid =
      item.youtubeVideoId?.trim() ||
      extractYouTubeVideoId(adUrl) ||
      extractYouTubeVideoId(pu) ||
      extractYouTubeVideoId(iu) ||
      "";
    if (!yid) {
      for (const s of [item.description, item.headline, item.title, fromHeadline]) {
        if (typeof s !== "string") continue;
        const id = extractYouTubeVideoId(s);
        if (id) {
          yid = id;
          break;
        }
      }
    }
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
    if (yid) thumb = youtubePosterUrlFromVideoId(yid);
    if (!thumb && iu && !isGoogleFaviconUrl(iu) && isUsableGoogleStillImagePreviewUrl(iu)) thumb = iu;
    if (!thumb && pu && isUsableGoogleStillImagePreviewUrl(pu) && findFirstGoogleCreativeImageUrl(pu)) thumb = pu;
    if (!thumb && nested) thumb = nested;
    if (!thumb && ytFromFields) thumb = ytFromFields;
    if (!thumb) thumb = youtubeThumbnailFromUrl(adUrl) || "";

    const videoFile =
      item.creativeVideoUrl?.trim() ||
      (pu && findFirstGoogleVideoFileUrl(pu) ? pu : null) ||
      (iu && findFirstGoogleVideoFileUrl(iu) ? iu : null) ||
      "";

    return {
      type: "youtube",
      id,
      title,
      channel: item.advertiserName || cleanHost(displayDomain) || "Advertiser",
      views: item.lastShown ? `Updated ${item.lastShown.slice(0, 10)}` : "Google Ads Transparency",
      thumbnail: thumb,
      youtubeVideoId: yid || null,
      videoUrl: videoFile || null,
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

/**
 * Heuristic: higher = more likely to show a real thumbnail or first video frame in the UI.
 * Sort descending so inline dashboard slots favor creatives with playable/static preview assets.
 * (CDN expiry / CORS can still make a high score row fail at runtime.)
 */
export function googleAdRowPreviewLikelihood(row: GoogleAdRow): number {
  if (row.type === "youtube") {
    let s = 0;
    if (row.videoUrl?.trim()) s += 50;
    if (row.youtubeVideoId?.trim()) s += 30;
    const th = row.thumbnail?.trim() || "";
    if (th) {
      if (isUsableGoogleStillImagePreviewUrl(th)) s += 20;
      else if (/^https:\/\/img\.youtube\.com\/vi\//i.test(th)) s += 20;
    }
    if (!row.youtubeVideoId?.trim() && row.adUrl && youtubeThumbnailFromUrl(row.adUrl)) s += 10;
    return s;
  }
  const preview = row.previewUrl?.trim() || "";
  const img = row.img?.trim() || "";
  let s = 0;
  if (preview && isUsableGoogleStillImagePreviewUrl(preview)) s += 40;
  if (img && !isGoogleFaviconUrl(img)) {
    if (isUsableGoogleStillImagePreviewUrl(img)) s += 40;
    else s += 8;
  }
  return s;
}

export function linkedInItemToCard(
  item: LinkedInAdItem,
  index: number,
  ctx?: { confirmedCompanyId?: string }
): LinkedInAdCard {
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

  const confirmedCo = ctx?.confirmedCompanyId?.trim();
  const scrapedCo = item.advertiserCompanyId?.trim();
  const advertiserMismatch =
    Boolean(confirmedCo) && Boolean(scrapedCo) && scrapedCo !== confirmedCo;

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
    ...(advertiserMismatch ? { advertiserMismatch: true } : {}),
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
    advertiserCompanyId: linkedInAdvertiserCompanyIdFromDatasetRow(raw),
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
    advertiserCompanyId: linkedInAdvertiserCompanyIdFromDatasetRow(raw),
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

  return {
    ...item,
    image,
    video,
    advertiserCompanyId:
      item.advertiserCompanyId ?? linkedInAdvertiserCompanyIdFromDatasetRow(raw),
  };
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
      advertiserCompanyId: linkedInAdvertiserCompanyIdFromDatasetRow(raw),
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
    const low = s.toLowerCase();
    if (low.includes("sc-cdn.net") || low.includes("snapcdn")) return s;
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

/** Publisher badge / Bolt-resolved tiny asset — not the EU gallery hero creative (`/d/…`). */
function isLikelySnapProfileBoltAssetUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    /^https:\/\//i.test(url.trim()) &&
    u.includes("sc-cdn.net") &&
    u.includes("/aps/bolt/")
  );
}

function snapCreativeImageScore(url: string): number {
  if (!url.trim()) return -Infinity;
  if (looksLikeVideoFileUrl(url)) return -Infinity;
  if (isLikelySnapProfileBoltAssetUrl(url)) return -1_000_000;
  const u = url.toLowerCase();
  let base = u.includes("/d/") ? 5_000_000 : 0;
  if (/\.(png|jpe?g|webp|gif|avif|bmp)(\?|#|$)/i.test(url)) base += 100;
  /** Longer Snapchat CDN URLs usually carry fuller creative payloads */
  base += Math.min(url.length, 4000);
  return base;
}

/** Walk row like `deepFindHttpsImageUrl` but **collect** candidates and pick hero over Bolt logo. */
function deepFindSnapPreferredCreativeImage(value: unknown, depth = 0, acc: string[] = []): string[] {
  if (depth > 12) return acc;
  if (typeof value === "string") {
    const s = value.trim();
    if (/^https?:\/\//i.test(s) && s.length <= 4000) {
      const low = s.toLowerCase();
      const onSnapHost = low.includes("sc-cdn.net") || low.includes("snapcdn");
      if (!onSnapHost || looksLikeVideoFileUrl(s)) return acc;
      const rasterExt =
        /\.(png|jpe?g|gif|webp|avif|bmp)(\?|#|$)/i.test(s) || /\b_FMpng\b/i.test(s);
      const heroDelivery = /\/d\//.test(low);
      const boltBadge = /\/?aps\/bolt\//.test(low);
      if (heroDelivery || rasterExt || boltBadge) acc.push(s);
    }
    return acc;
  }
  if (Array.isArray(value)) {
    for (const v of value) deepFindSnapPreferredCreativeImage(v, depth + 1, acc);
    return acc;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>))
      deepFindSnapPreferredCreativeImage(v, depth + 1, acc);
  }
  return acc;
}

function deepPickSnapHeroImageFromUnknown(value: unknown): string {
  const cands = deepFindSnapPreferredCreativeImage(value, 0);
  let best = "";
  let score = -Infinity;
  for (const u of cands) {
    const sc = snapCreativeImageScore(u);
    if (sc > score) {
      score = sc;
      best = u;
    }
  }
  return Number.isFinite(score) && score > -500_000 ? best : "";
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

/** Pull human-readable fragments from heterogeneous targeting payloads. */
function collectPinterestTargetingValues(v: unknown, depth = 0): string[] {
  if (depth > 8) return [];
  if (v == null) return [];
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean") {
    const s = String(v).trim();
    return s !== "" ? [s.replace(/\s+/g, " ")] : [];
  }
  if (Array.isArray(v)) {
    const chunks = v.flatMap((x) => collectPinterestTargetingValues(x, depth + 1)).filter(Boolean);
    return pinterestDedupePreserveOrder(chunks);
  }
  if (t === "object") {
    const o = v as Record<string, unknown>;
    const named =
      firstString(o, ["name", "label", "title", "text", "value", "slug", "formattedName", "displayName"]) ??
      "";
    if (named.trim()) return [named.trim().replace(/\s+/g, " ")];
    const chunks: string[] = [];
    for (const val of Object.values(o)) {
      chunks.push(...collectPinterestTargetingValues(val, depth + 1));
    }
    return pinterestDedupePreserveOrder(chunks);
  }
  return [];
}

function pinterestDedupePreserveOrder(parts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p.trim());
  }
  return out;
}

function pinterestTitleCaseKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/\w\S*/g, (x) => x.charAt(0).toUpperCase() + x.slice(1));
}

/** Preferred field order · label copy for Ads Library targeting objects. */
const PINTEREST_TARGETING_KEY_ORDER: readonly string[] = [
  "ages",
  "ageGroups",
  "genders",
  "countries",
  "regions",
  "metros",
  "dma",
  "locations",
  "languages",
  "deviceTypes",
  "devices",
  "placementTypes",
  "placements",
  "partnerCategories",
  "interests",
  "interestCategories",
  "topics",
  "audienceKeywords",
  "keywords",
];

const PINTEREST_TARGETING_LABELS: Partial<Record<string, string>> = {
  ages: "Age ranges",
  ageGroups: "Age ranges",
  genders: "Genders",
  countries: "Countries",
  regions: "Regions / states",
  metros: "Metro areas",
  dma: "Metro areas",
  locations: "Locations",
  languages: "Languages",
  deviceTypes: "Devices",
  devices: "Devices",
  placementTypes: "Placements",
  placements: "Placements",
  partnerCategories: "Partner categories",
  interests: "Topics & interests",
  interestCategories: "Interest categories",
  topics: "Topics",
  audienceKeywords: "Audience keywords",
  keywords: "Keywords",
};

function mergePinterestTargetingRows(rows: PinterestTargetingRow[]): PinterestTargetingRow[] {
  const m = new Map<string, string>();
  for (const r of rows) {
    const prev = m.get(r.label);
    const next = prev ? `${prev}; ${r.value}` : r.value;
    m.set(r.label, next);
  }
  return [...m.entries()].map(([label, value]) => ({ label, value }));
}

function parsePinterestTargeting(targeting: unknown): PinterestTargetingRow[] {
  if (!targeting || typeof targeting !== "object" || Array.isArray(targeting)) return [];
  const o = targeting as Record<string, unknown>;
  const used = new Set<string>();
  const rows: PinterestTargetingRow[] = [];

  for (const key of PINTEREST_TARGETING_KEY_ORDER) {
    if (!(key in o)) continue;
    const vals = collectPinterestTargetingValues(o[key]);
    if (!vals.length) continue;
    used.add(key);
    const label = PINTEREST_TARGETING_LABELS[key] ?? pinterestTitleCaseKey(key);
    rows.push({ label, value: vals.join(", ") });
  }

  const rest = Object.keys(o)
    .filter((k) => !used.has(k) && typeof k === "string" && !k.startsWith("_"))
    .sort();

  for (const key of rest) {
    const vals = collectPinterestTargetingValues(o[key]);
    if (!vals.length) continue;
    rows.push({ label: pinterestTitleCaseKey(key), value: vals.join(", ") });
  }

  return mergePinterestTargetingRows(rows);
}

function summarizePinterestTargetingRows(rows: PinterestTargetingRow[]): string {
  if (!rows.length) return "—";
  return rows.map((r) => `${r.label}: ${r.value}`).join(" · ");
}

function pinterestDisclosureDates(raw: Record<string, unknown>): { start?: string; end?: string } {
  const start =
    firstString(raw, ["startDate", "StartDate", "startedAt", "deliveryStartDate", "campaignStartDate"]) ??
    "";
  const end =
    firstString(raw, ["endDate", "EndDate", "endedAt", "deliveryEndDate", "campaignEndDate"]) ?? "";
  return {
    ...(start.trim() ? { start: start.trim() } : {}),
    ...(end.trim() ? { end: end.trim() } : {}),
  };
}

function formatPinterestDisclosureDate(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  const parsed = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(t) ? `${t}T12:00:00Z` : t;
  const d = new Date(parsed);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  return t.length > 56 ? `${t.slice(0, 56)}…` : t;
}

function pinterestDisclosureWindowText(raw: Record<string, unknown>): string | null {
  const { start, end } = pinterestDisclosureDates(raw);
  if (start && end) {
    const a = formatPinterestDisclosureDate(start);
    const b = formatPinterestDisclosureDate(end);
    return `Ran ${a} – ${b}`;
  }
  if (start) return `From ${formatPinterestDisclosureDate(start)}`;
  if (end) return `Until ${formatPinterestDisclosureDate(end)}`;
  const single =
    firstString(raw, ["disclosureDate", "DisclosureDate", "shownAt", "lastSeen", "scrapedAt"]) ?? "";
  if (single.trim()) return `Shown ${formatPinterestDisclosureDate(single.trim())}`;
  return null;
}

function pinterestReachSummary(reach: unknown): string | null {
  if (!reach || typeof reach !== "object") return null;
  const o = reach as Record<string, unknown>;
  const raw = o.totalEU ?? o.totalEu;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return null;
}

/** Map zadexinho/pinterest-ads-scraper dataset row → card (PascalCase + camelCase). */
export function pinterestDatasetItemToCard(
  raw: Record<string, unknown>,
  index: number,
  ctx?: { brandName?: string; brandDomain?: string }
): PinterestAdCard {
  const pinId = raw.id ?? raw.Id ?? raw.pinId;
  const id = pinId != null ? String(pinId) : `pin-${index}`;

  const headline =
    firstString(raw, ["title", "Title", "headline", "Headline"]) || "Pinterest ad";

  let advertiser =
    firstString(raw, ["advertiserName", "AdvertiserName", "advertiser"]) || "Advertiser";
  if (GENERIC_ADVERTISER_PLACEHOLDER.test(advertiser.trim())) {
    const fb = effectiveCompetitorBrandLabel(ctx?.brandName, ctx?.brandDomain);
    if (fb) advertiser = fb;
  }

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
  const targetingRows = parsePinterestTargeting(targeting);
  const desc = summarizePinterestTargetingRows(targetingRows);

  const reachSummary = pinterestReachSummary(raw.reach ?? raw.Reach);
  const impressionsLabelRaw =
    firstString(raw, [
      "impressionsLabel",
      "impressionsRange",
      "ImpressionsRange",
      "impressionRange",
      "ImpressionRange",
      "estimatedImpressions",
      "estimated_impressions",
    ]) ?? "";

  const disclosureWindow = pinterestDisclosureWindowText(raw);

  const adUrl =
    safeHttpsUrl(pinUrl) ||
    safeHttpsUrl(productUrl) ||
    "https://www.pinterest.com/";

  const bn = ctx?.brandName?.trim() ?? "";
  const advertiserMismatch =
    (Boolean(bn) || Boolean(cleanDomainHost(ctx?.brandDomain))) &&
    brandAdvertiserNameMismatchForCard(bn, advertiser, ctx?.brandDomain);

  return {
    id,
    headline,
    desc,
    url: destHost,
    img,
    videoUrl: videoUrl || undefined,
    advertiser,
    adUrl,
    ...(targetingRows.length ? { targetingRows } : {}),
    reachSummary,
    ...(impressionsLabelRaw.trim()
      ? { impressionsLabel: impressionsLabelRaw.trim() }
      : {}),
    ...(disclosureWindow ? { disclosureWindow } : {}),
    ...(advertiserMismatch ? { advertiserMismatch: true } : {}),
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

function parseTikTokAudienceScalar(fragment: string): number | null {
  const compact = fragment.replace(/\s+/g, "").replace(/,/g, "").trim();
  if (!compact) return null;
  const m = /^([\d.]+)([kmb]?)$/i.exec(compact);
  if (!m) {
    const n = Number(compact);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const suf = (m[2] ?? "").toUpperCase();
  const mult = suf === "B" ? 1e9 : suf === "M" ? 1e6 : suf === "K" ? 1e3 : 1;
  return n * mult;
}

/**
 * TikTok exposes reach as labelled bands (“100K–200K”, “&lt;1K”). No actor sort knob exists —
 * we approximate with a midpoint / lower bound so higher‑reach ads bubble up after fetch.
 *
 * Returns `-1` when unknown so missing rows sort last.
 */
export function tikTokAudienceBandSortScore(label: string | null | undefined): number {
  if (label == null) return -1;
  const s = label.replace(/\u2013/g, "-").replace(/\u2014/g, "-").trim();
  if (!s) return -1;
  const low = s.toLowerCase();

  const lt = /^<\s*(~?\s*)?([\d.,]+\s*[kmb]?)\s*$/i.exec(low);
  if (lt?.[2]) {
    const u = parseTikTokAudienceScalar(lt[2].replace(/\s+/g, ""));
    return u != null ? u * 0.45 : 0;
  }

  const range = /([\d.,]+\s*[kmb]?)\s*-\s*([\d.,]+\s*[kmb]?)/i.exec(low);
  if (range) {
    const a = parseTikTokAudienceScalar(range[1]!.replace(/\s+/g, ""));
    const b = parseTikTokAudienceScalar(range[2]!.replace(/\s+/g, ""));
    if (a != null && b != null) return (a + b) / 2;
    if (a != null) return a;
    if (b != null) return b;
  }

  const plus = /^([\d.,]+\s*[kmb]?)\s*\+$/i.exec(low.trim());
  if (plus?.[1]) {
    const u = parseTikTokAudienceScalar(plus[1].replace(/\s+/g, ""));
    return u != null ? u * 1.2 : 0;
  }

  const single = parseTikTokAudienceScalar(low.replace(/^~\s*/, "").trim());
  if (single != null) return single;
  return 0;
}

export function sortTikTokAdsForResponse(ads: TikTokAdCard[]): TikTokAdCard[] {
  return [...ads].sort((a, b) => {
    const sa = tikTokAudienceBandSortScore(a.uniqueUsersSeen);
    const sb = tikTokAudienceBandSortScore(b.uniqueUsersSeen);
    if (sb !== sa) return sb - sa;
    return String(a.id).localeCompare(String(b.id));
  });
}

/** Map data_xplorer/tiktok-ads-library-pay-per-event dataset row → card. */
export function tiktokApifyItemToCard(
  raw: Record<string, unknown>,
  index: number,
  ctx?: { brandName?: string; brandDomain?: string }
): TikTokAdCard | null {
  const id =
    firstString(raw, ["adId", "ad_id", "AD ID", "id"]) ?? `tt-${index}`;
  let advertiser =
    firstString(raw, ["advertiserName", "Advertiser Name", "ad_sponsor", "Ad Sponsor"]) ??
    "Advertiser";
  if (GENERIC_ADVERTISER_PLACEHOLDER.test(advertiser.trim())) {
    const fb = effectiveCompetitorBrandLabel(ctx?.brandName, ctx?.brandDomain);
    if (fb) advertiser = fb;
  }
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

  const bn = ctx?.brandName?.trim() ?? "";
  const advertiserMismatch =
    (Boolean(bn) || Boolean(cleanDomainHost(ctx?.brandDomain))) &&
    brandAdvertiserNameMismatchForCard(bn, advertiser, ctx?.brandDomain);

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
    ...(advertiserMismatch ? { advertiserMismatch: true } : {}),
  };
}

/** Snapchat CDN creative URLs usually have no `.jpg` / `.mp4` suffix — identify by host. */
export function isLikelySnapCdnMediaUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    /^https:\/\//i.test(url.trim()) &&
    (u.includes("sc-cdn.net") || u.includes("snapcdn") || u.includes("cf-st."))
  );
}

/**
 * Stable `mediaUrl` / `MediaUrl` read — used when sorting scraped rows before mapping to cards.
 * @returns 0 = none, 1 = logo/other only would need separate check — here we count only hero `mediaUrl`
 */
export function snapchatDatasetRowMediaPriority(row: Record<string, unknown>): number {
  const m =
    (typeof row.mediaUrl === "string" ? row.mediaUrl.trim() : "") ||
    (typeof row.MediaUrl === "string" ? row.MediaUrl.trim() : "") ||
    (() => {
      const u = snapPickFromRowIgnoreCase(row, "mediaurl");
      return typeof u === "string" ? u.trim() : "";
    })();
  if (!m) return 0;
  /** Huge base so rows with hero `mediaUrl` always sort / merge ahead of logo-only snapshots. */
  return 10_000_000 + Math.min(Math.max(m.length, 8), 50_000);
}

/**
 * Dashboard / modal sort key — prefers real creatives (Snap `/d/…` raster, non-Bolt video)
 * over **`/aps/bolt/…` publisher logos** after rows are mapped to {@link SnapchatAdCard}.
 */
export function snapchatAdCardCreativePriority(ad: SnapchatAdCard): number {
  const v = ad.videoUrl?.trim() ?? "";
  const i = ad.img?.trim() ?? "";
  let best = 0;

  if (/\.(mp4|m3u8|webm)(\?|$)/i.test(v)) {
    best = Math.max(best, 50_000_000 + Math.min(v.length, 10_000));
  } else if (v) {
    best = Math.max(best, 40_000_000 + Math.min(v.length, 10_000));
  }

  const il = i.toLowerCase();
  const onSnapCdn =
    il.includes("sc-cdn.net") || il.includes("cf-st.") || il.includes("snapcdn");
  if (i && onSnapCdn) {
    const bolt = /\/aps\/bolt\//.test(il);
    const heroDelivery = /\/d\//.test(il);
    if (heroDelivery && !bolt) {
      best = Math.max(best, 47_000_000 + Math.min(i.length, 10_000));
    } else if (bolt) {
      best = Math.max(best, 1_000_000 + Math.min(i.length, 5000));
    } else {
      best = Math.max(best, 42_000_000 + Math.min(i.length, 10_000));
    }
  } else if (i) {
    best = Math.max(best, 35_000_000 + Math.min(i.length, 10_000));
  }

  return best;
}

/**
 * Sort key: EU gallery rows with a real `mediaUrl` (or legacy `/d/…` preview) rank above logo-only cards.
 * Used for API responses (including Supabase cache) and the competitor dashboard inline row.
 */
export function snapchatAdHeroMediaTier(ad: SnapchatAdCard): number {
  if (ad.hasHeroMediaUrl === true) return 1;
  const i = ad.img?.toLowerCase() ?? "";
  if (i.includes("/d/") && !i.includes("/aps/bolt/")) return 1;
  return 0;
}

export function sortSnapchatAdsForResponse(ads: SnapchatAdCard[]): SnapchatAdCard[] {
  return [...ads].sort((a, b) => {
    const tierDiff = snapchatAdHeroMediaTier(b) - snapchatAdHeroMediaTier(a);
    if (tierDiff !== 0) return tierDiff;
    const cre = snapchatAdCardCreativePriority(b) - snapchatAdCardCreativePriority(a);
    if (cre !== 0) return cre;
    return String(a.id).localeCompare(String(b.id));
  });
}

/** Canonical key match: ignores case and `_`/`-`/spaces (handles `campaign_start_date` etc.). */
function snapKeyNorm(s: string): string {
  return s.toLowerCase().replace(/[\s_-]+/g, "");
}

/** First property whose normalized key equals any `targetNorm` blob. */
function snapPickFromRowIgnoreCase(row: Record<string, unknown>, targetNorm: string): unknown {
  const tn = snapKeyNorm(targetNorm);
  for (const [k, v] of Object.entries(row)) {
    if (snapKeyNorm(k) === tn) return v;
  }
  return undefined;
}

/** Prefer canonical actor keys (`brandName`), then `firstString` lists. */
function snapPickString(raw: Record<string, unknown>, ...candidates: string[]): string | undefined {
  const tryVal = (v: unknown): string | undefined => {
    if (typeof v === "string") {
      const t = v.trim();
      return t || undefined;
    }
    return undefined;
  };
  for (const k of candidates) {
    const a = tryVal(raw[k]);
    if (a) return a;
    const b = tryVal(snapPickFromRowIgnoreCase(raw, k.replace(/_/g, "")));
    if (b) return b;
  }
  return undefined;
}

function snapPickNumericLike(raw: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    let v = raw[k];
    if (v === undefined || v === null) v = snapPickFromRowIgnoreCase(raw, k.replace(/_/g, ""));
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const cleaned = v.trim().replace(/,/g, "");
      if (/^\d+$/.test(cleaned)) return Number(cleaned);
      if (/^\d+\.\d+$/.test(cleaned)) return Number(cleaned);
    }
  }
  return undefined;
}

function snapPickDate(raw: Record<string, unknown>, ...canonicalKeys: string[]): unknown {
  for (const k of canonicalKeys) {
    let v = raw[k];
    if (v === undefined || v === null) v = snapPickFromRowIgnoreCase(raw, k.replace(/_/g, ""));
    if (v !== undefined && v !== null && !(typeof v === "string" && !v.trim())) return v;
  }
  return undefined;
}

/** Normalize EU gallery–style ISO date-ish fields for display labels. */
function formatSnapchatRowDate(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const t = value.trim();
    if (!t || /^n\/?a$/i.test(t)) return "N/A";
    const d = new Date(t);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    return t;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
  }
  return null;
}

function formatSnapImpressionsLabel(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value).toLocaleString("en-US");
  }
  if (typeof value === "string" && value.trim()) {
    const t = value.trim().replace(/,/g, "");
    if (/^\d+$/.test(t)) return Number(t).toLocaleString("en-US");
    return value.trim();
  }
  return null;
}

export function snapchatDatasetItemToCard(
  raw: Record<string, unknown>,
  index: number,
  ctx?: { brandName?: string; brandDomain?: string }
): SnapchatAdCard {
  const sid =
    snapPickString(raw, "adId", "AdId") ||
    firstString(raw, ["ad_id", "adID", "id", "snapAdId", "adLibraryId", "uuid", "Ad ID"]) ||
    "";

  const id = sid ? String(sid) : `snap-${index}`;

  const headline =
    snapPickString(raw, "headline", "Headline") ||
    firstString(raw, ["title", "adTitle", "AdTitle", "primaryText", "name"]) ||
    snapPickString(raw, "brandName", "BrandName") ||
    "Snapchat ad";

  let advertiser =
    snapPickString(raw, "advertiserName", "AdvertiserName") ||
    firstString(raw, ["advertiser", "Advertiser", "publisher", "Publisher", "companyName"]) ||
    snapPickString(raw, "brandName", "BrandName") ||
    "Advertiser";
  if (GENERIC_ADVERTISER_PLACEHOLDER.test(advertiser.trim())) {
    const fb = effectiveCompetitorBrandLabel(ctx?.brandName, ctx?.brandDomain);
    if (fb) advertiser = fb;
  }

  let videoUrl =
    firstString(raw, [
      "videoUrl",
      "video_url",
      "VideoUrl",
      "creativeVideoUrl",
      "videoMP4Url",
      "videoMp4Url",
      "mp4Url",
      "hlsUrl",
      "snapVideoUrl",
    ]) || "";

  const profilePoster =
    snapPickString(raw, "profileLogoUrl", "ProfileLogoUrl", "publisherLogoUrl", "logoUrl") || "";

  let img =
    firstString(raw, [
      "imageUrl",
      "ImageUrl",
      "thumbnailUrl",
      "ThumbnailUrl",
      "posterUrl",
      "PosterUrl",
      "previewUrl",
      "PreviewUrl",
      "previewImageUrl",
      "creativeImageUrl",
      "creativeUrl",
      "thumbnail",
      "image",
      "screenshotUrl",
      "snapImageUrl",
    ]) || "";

  const mediaUrlFlat =
    (typeof raw.mediaUrl === "string" ? raw.mediaUrl.trim() : "") ||
    (typeof raw.MediaUrl === "string" ? raw.MediaUrl.trim() : "") ||
    (() => {
      const v = snapPickFromRowIgnoreCase(raw, "mediaUrl");
      return typeof v === "string" ? v.trim() : "";
    })();

  const hasHeroMediaUrlField = Boolean(mediaUrlFlat);

  /** Snapchat `mediaUrl` without `.mp4` is almost always a raster/web snapshot — preview with `<img>`, not `<video>`. */
  if (mediaUrlFlat) {
    if (looksLikeVideoFileUrl(mediaUrlFlat)) {
      if (!videoUrl) videoUrl = mediaUrlFlat;
      if (img && isLikelySnapProfileBoltAssetUrl(img)) img = "";
    } else if (isLikelySnapCdnMediaUrl(mediaUrlFlat)) {
      img = mediaUrlFlat;
    } else if (!img) {
      img = mediaUrlFlat;
    }
  }

  if (img && looksLikeVideoFileUrl(img)) {
    if (!videoUrl) videoUrl = img;
    img = "";
  }

  if (!hasHeroMediaUrlField && !img) {
    const snapPick = deepPickSnapHeroImageFromUnknown(raw);
    if (snapPick) img = snapPick;
  }

  /** Profile Bolt logo preview only when the row exposes no hero `mediaUrl`. */
  if (!hasHeroMediaUrlField && !img && profilePoster) img = profilePoster;

  /**
   * EU gallery `mediaUrl` without a video extension is a static snapshot — never layer a discovered
   * MP4/HLS on top (browser shows `<video>` with Bolt poster + broken playback).
   */
  const euRasterHero =
    hasHeroMediaUrlField && Boolean(mediaUrlFlat) && !looksLikeVideoFileUrl(mediaUrlFlat);

  if (!videoUrl && !euRasterHero) {
    const deepVid = deepFindHttpsVideoUrl(raw);
    if (deepVid) videoUrl = deepVid;
  }
  if (euRasterHero) {
    videoUrl = "";
  }

  const statusRaw = firstString(raw, ["status", "deliveryStatus", "Status", "adStatus", "state"]) || null;
  const status = statusRaw ? statusRaw.toUpperCase() : null;

  const brandAdvertised =
    snapPickString(
      raw,
      "brandAdvertised",
      "BrandAdvertised",
      "advertisedBrand",
      "AdvertisedBrand",
      "AdvertisedBrandName",
    ) ??
    snapPickString(raw, "brandName", "BrandName") ??
    firstString(raw, ["brand_advertised"]) ??
    null;

  const startRaw = snapPickDate(
    raw,
    "campaignStartDate",
    "CampaignStartDate",
    "adStartDate",
    "AdStartDate",
    "startDate",
    "StartDate",
    "ad_start_date",
    "campaign_start_date",
  );

  const endRaw = snapPickDate(
    raw,
    "campaignEndDate",
    "CampaignEndDate",
    "adEndDate",
    "AdEndDate",
    "endDate",
    "EndDate",
    "ad_end_date",
    "campaign_end_date",
  );

  const startDateLabel = formatSnapchatRowDate(startRaw) ?? null;
  const endDateLabel = formatSnapchatRowDate(endRaw) ?? null;

  const ctaLabel =
    snapPickString(raw, "callToAction", "CallToAction") ??
    firstString(raw, ["cta", "ctaText", "call_to_action", "CTA", "ctaLabel", "buttonText", "ButtonText"]) ??
    null;

  const descParts: string[] = [];
  if (statusRaw) descParts.push(statusRaw);
  const paid = raw.paidReach ?? raw.paid_impressions ?? raw.estimatedAudience;
  if (typeof paid === "string" && paid.trim()) descParts.push(paid.trim());
  const reviewSt = firstString(raw, ["reviewStatus", "ReviewStatus"]);
  if (reviewSt) descParts.push(`Review: ${reviewSt}`);
  const desc =
    descParts.length > 0 ? descParts.join(" · ") : firstString(raw, ["body", "description"]) || "—";

  const landing =
    snapPickString(raw, "destinationUrl", "landingUrl", "websiteUrl", "callToActionUrl", "ctaUrl") ||
    firstString(raw, ["destination_url", "landing_url"]) ||
    "";
  const urlHost =
    landing.replace(/^https?:\/\//, "").split("/")[0]?.slice(0, 48) ||
    advertiser.slice(0, 48).toLowerCase() ||
    "snapchat.com";

  const adUrl =
    safeHttpsUrl(
      snapPickString(raw, "adPreviewUrl", "previewUrlFull", "adUrl", "detailUrl", "galleryUrl", "url", "Url") ?? "",
    ) ||
    safeHttpsUrl(landing) ||
    "https://www.snapchat.com/ads/about";

  const euCountry =
    snapPickString(raw, "country", "countryCode", "market", "targetCountry", "TargetCountry", "euCountry") ||
    firstString(raw, ["country_code", "eu_country"]);

  let impressionsLabel: string | null =
    formatSnapImpressionsLabel(
      snapPickNumericLike(
        raw,
        "impressionsTotal",
        "ImpressionsTotal",
        "totalImpressions",
        "TotalImpressions",
        "impressionsCountry",
        "ImpressionsCountry",
        "impressions",
        "Impressions",
        "paidImpressions",
        "PaidImpressions",
        "estimatedImpressions",
      ),
    ) ??
    formatSnapImpressionsLabel(firstString(raw, ["estimated_impressions"])) ??
    firstString(raw, ["reach"]) ??
    null;

  const bn = ctx?.brandName?.trim() ?? "";
  const advertiserMismatch =
    (Boolean(bn) || Boolean(cleanDomainHost(ctx?.brandDomain))) &&
    brandAdvertiserNameMismatchForCard(bn, advertiser, ctx?.brandDomain);

  const suppressCreativeHeadline =
    hasHeroMediaUrlField || /\bunreal\s+motion\b/i.test(headline.trim());

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
    status,
    brandAdvertised: brandAdvertised ?? null,
    startDateLabel,
    endDateLabel,
    ctaLabel: ctaLabel ?? null,
    suppressCreativeHeadline,
    hasHeroMediaUrl: hasHeroMediaUrlField,
    ...(advertiserMismatch ? { advertiserMismatch: true } : {}),
  };
}
