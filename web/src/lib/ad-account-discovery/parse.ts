import { metaLocationAudienceRows } from "@/lib/ad-detail/meta-ad-detail-fields";
import { ISO_3166_1_ALPHA2_CODES } from "@/lib/ad-library/google-ads-regions";
import { creativeSource } from "@/lib/ad-library/transcribe-ad-creatives";
import { facebookPageKey, hostOf, type MetaAdSample } from "@/lib/ad-account-discovery/score";

/** Turns raw scraper output and website HTML into the samples the scorer reads. Pure: no network. */

const rec = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/**
 * Facebook pages a website links to (header/footer icons, JSON-LD `sameAs`), as page keys. Share and
 * plugin links aren't pages and are skipped.
 */
export function websiteFacebookKeysFromHtml(html: string): string[] {
  const text = html.replace(/\\\//g, "/").replace(/&amp;/g, "&");
  const keys = new Set<string>();
  for (const m of text.matchAll(/https?:\/\/(?:[a-z]+\.)?facebook\.com\/[^\s"'<>)\\]+/gi)) {
    const key = facebookPageKey(m[0]);
    if (key && !/^(sharer|share|dialog|plugins|tr|login|ads|groups|events|watch|hashtag)/.test(key)) keys.add(key);
  }
  return [...keys];
}

let countryCodes: Map<string, string> | null = null;

/** ISO-2 code for an English country name as Meta's transparency data writes it ("Latvia" → LV). */
export function countryCodeForName(name: string): string | null {
  if (!countryCodes) {
    countryCodes = new Map();
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    for (const code of ISO_3166_1_ALPHA2_CODES) {
      const label = dn.of(code);
      if (label) countryCodes.set(label.toLowerCase(), code);
    }
    countryCodes.set("united states of america", "US");
    countryCodes.set("uk", "GB");
  }
  return countryCodes.get(name.trim().toLowerCase()) ?? null;
}

/** One Meta Ad Library item (curious_coder actor) → the paying page, its link and targeted countries. */
export function metaSampleFromItem(item: unknown): MetaAdSample | null {
  const row = rec(item);
  if (!row) return null;
  const snap = rec(row.snapshot) ?? {};
  const pageId = str(row.page_id) ?? str(snap.page_id) ?? (typeof row.page_id === "number" ? String(row.page_id) : null);
  if (!pageId) return null;
  const linkHost = hostOf(str(snap.link_url)) ?? hostOf(str(snap.caption));
  const countries = metaLocationAudienceRows(row)
    .filter((l) => !l.excluded && (!l.type || l.type === "countries"))
    .map((l) => countryCodeForName(l.name))
    .filter((c): c is string => c != null);
  return {
    pageId,
    pageName: str(row.page_name) ?? str(snap.page_name) ?? pageId,
    profileUri: str(snap.page_profile_uri),
    pictureUrl: str(snap.page_profile_picture_url),
    linkHost,
    branded: rec(snap.branded_content) != null,
    countries: [...new Set(countries)],
  };
}

type CreativeSource = { kind: "image" | "preview_script"; url: string };

export type GoogleAdvertiserRow = {
  advertiserId: string;
  advertiserName: string;
  /** Copy Google published with the ad, when any. */
  publishedText: string | null;
  /** Where one of its ads can be read, free preview scripts before images (which cost a vision call). */
  creatives: CreativeSource[];
};

/** Google Transparency rows (lurkapi actor) → one entry per advertiser, with its ads to read. */
export function googleAdvertiserRows(items: unknown[]): GoogleAdvertiserRow[] {
  const byId = new Map<string, GoogleAdvertiserRow>();
  for (const item of items) {
    const row = rec(item);
    const advertiserId = str(row?.advertiserId);
    if (!row || !advertiserId || !/^AR\d+$/.test(advertiserId)) continue;
    const entry =
      byId.get(advertiserId) ??
      byId.set(advertiserId, { advertiserId, advertiserName: str(row.advertiserName) ?? advertiserId, publishedText: null, creatives: [] }).get(advertiserId)!;
    entry.publishedText ??= [str(row.headline), str(row.description)].filter(Boolean).join("\n") || null;
    for (const src of [creativeSource({ previewUrl: row.previewUrl }), creativeSource({ img: row.imageUrl })]) {
      if (src && !entry.creatives.some((c) => c.url === src.url)) entry.creatives.push(src);
    }
  }
  for (const e of byId.values()) e.creatives.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "preview_script" ? -1 : 1));
  return [...byId.values()];
}
