/** Meta Ads Library fields for the competitor ad detail drawer (payload → labels). */

const PUBLISH_ORDER = [
  "FACEBOOK",
  "INSTAGRAM",
  "THREADS",
  "MESSENGER",
  "AUDIENCE_NETWORK",
  "WHATSAPP",
  "OCULUS",
] as const;

const PUBLISH_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  THREADS: "Threads",
  MESSENGER: "Messenger",
  AUDIENCE_NETWORK: "Audience Network",
  WHATSAPP: "WhatsApp",
  OCULUS: "Oculus",
};

function metaPayloadRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

/**
 * Walk the full scraper row (including `adsLibraryItem`, `json`, etc.) and collect the last
 * non-empty Meta transparency fields. Top-level `MetaAdCard` rows often omit these even when
 * nested objects still carry `location_audience` / `age_audience` / `gender_audience`.
 */
export function harvestDeepMetaTransparencyFields(rawPayload: unknown): Record<string, unknown> {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return {};
  const root = rawPayload as Record<string, unknown>;

  const locs: unknown[] = [];
  const ages: unknown[] = [];
  const genders: string[] = [];
  const eus: boolean[] = [];

  const seen = new WeakSet<object>();

  function isFilledLocationArray(val: unknown): boolean {
    if (!Array.isArray(val) || val.length === 0) return false;
    return val.some((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return false;
      const name = (row as { name?: unknown }).name;
      return typeof name === "string" && name.trim().length > 0;
    });
  }

  function dfs(node: Record<string, unknown>): void {
    if (seen.has(node)) return;
    seen.add(node);
    for (const v of Object.values(node)) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        dfs(v as Record<string, unknown>);
      }
    }

    const loc = node.location_audience ?? node.locationAudience;
    if (isFilledLocationArray(loc)) locs.push(loc);

    const age = node.age_audience ?? node.ageAudience;
    if (age && typeof age === "object" && !Array.isArray(age)) {
      const o = age as Record<string, unknown>;
      const hasNums = o.min != null || o.max != null;
      const hasRangeText =
        (typeof o.range === "string" && o.range.trim()) ||
        (typeof o.ageRange === "string" && (o.ageRange as string).trim());
      if (hasNums || hasRangeText) ages.push(age);
    }

    const genderRaw = node.gender_audience ?? node.genderAudience;
    if (typeof genderRaw === "string" && genderRaw.trim()) genders.push(genderRaw.trim());

    const eu = node.targets_eu ?? node.targetsEu;
    if (typeof eu === "boolean") eus.push(eu);
  }

  dfs(root);

  const out: Record<string, unknown> = {};
  if (locs.length) out.location_audience = locs[locs.length - 1];
  if (ages.length) out.age_audience = ages[ages.length - 1];
  if (genders.length) out.gender_audience = genders[genders.length - 1];
  if (eus.length) out.targets_eu = eus[eus.length - 1];
  return out;
}

function metaRecordForTargetingReads(rawPayload: unknown): Record<string, unknown> | null {
  const top = metaPayloadRecord(rawPayload);
  if (!top) return null;
  return { ...top, ...harvestDeepMetaTransparencyFields(rawPayload) };
}

function normPublisherKey(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, "_");
}

function publisherDisplayLabel(rawToken: string): string {
  const k = normPublisherKey(rawToken);
  if (PUBLISH_LABELS[k]) return PUBLISH_LABELS[k];
  return rawToken
    .trim()
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export type MetaPublisherDetailRow = { key: string; label: string };

export function metaPublisherDetailRows(rawPayload: unknown): MetaPublisherDetailRow[] | null {
  const p = metaPayloadRecord(rawPayload);
  if (!p) return null;

  const arr = p.publisher_platform;
  if (!Array.isArray(arr) || arr.length === 0) return null;

  const keyed = [...new Set(arr.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean))]
    .map((raw) => ({
      raw,
      key: normPublisherKey(raw),
    }))
    .map((row) => ({ ...row, label: publisherDisplayLabel(row.raw) }))
    .filter((row) => row.label.length > 0);

  const orderRank = (key: string) => {
    const i = (PUBLISH_ORDER as readonly string[]).indexOf(key);
    return i >= 0 ? i : 100;
  };

  keyed.sort((a, b) => {
    const ia = orderRank(a.key);
    const ib = orderRank(b.key);
    if (ia !== ib) return ia - ib;
    return a.label.localeCompare(b.label, "en");
  });

  const seenKeys = new Set<string>();
  const ordered: MetaPublisherDetailRow[] = [];
  for (const row of keyed) {
    if (seenKeys.has(row.key)) continue;
    seenKeys.add(row.key);
    ordered.push({ key: row.key, label: row.label });
  }

  return ordered.length ? ordered : null;
}

export function formatMetaPublisherPlatformsLine(rawPayload: unknown): string | null {
  const rows = metaPublisherDetailRows(rawPayload);
  return rows?.length ? rows.map((r) => r.label).join(" · ") : null;
}

export function metaEuRegionDetailLabel(rawPayload: unknown): string | null {
  const p = metaRecordForTargetingReads(rawPayload);
  if (!p) return null;
  if (p.targets_eu !== true && p.targetsEu !== true) return null;
  return "EU";
}

/** Human-readable geography from `location_audience` rows when the scraper exposes them. */
export function metaLocationAudienceDetailLabel(rawPayload: unknown): string | null {
  const p = metaRecordForTargetingReads(rawPayload);
  if (!p) return null;
  const raw = p.location_audience ?? p.locationAudience;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const segments: string[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const o = row as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    if (!name) continue;
    segments.push(o.excluded === true ? `Exclude ${name}` : name);
  }
  return segments.length ? segments.join(" · ") : null;
}

/** e.g. `18–44` from `age_audience.min/max`. */
export function metaAgeAudienceDetailLabel(rawPayload: unknown): string | null {
  const p = metaRecordForTargetingReads(rawPayload);
  if (!p) return null;
  const raw = p.age_audience ?? p.ageAudience;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  let min =
    typeof o.min === "number" && Number.isFinite(o.min) ? Math.trunc(o.min)
    : typeof o.min === "string" && /^-?\d+$/.test(o.min.trim()) ? parseInt(o.min.trim(), 10)
    : null;
  let max =
    typeof o.max === "number" && Number.isFinite(o.max) ? Math.trunc(o.max)
    : typeof o.max === "string" && /^-?\d+$/.test(o.max.trim()) ? parseInt(o.max.trim(), 10)
    : null;

  /** Some payloads only send `range`/`ageRange`. */
  if (min == null && max == null) {
    const range =
      typeof o.range === "string" ? o.range.trim()
      : typeof o.ageRange === "string" ? o.ageRange.trim()
      : "";
    if (range) return range.replace(/\s*-\s*/g, "–");
  }

  if (min != null && max != null) return `${min}–${max}`;
  if (min != null) return `${min}+`;
  if (max != null) return `Up to ${max}`;
  return null;
}

/** Raw disclosure string from Meta (`gender_audience`), e.g. All / Men / Women. */
export function metaGenderAudienceDetailLabel(rawPayload: unknown): string | null {
  const p = metaRecordForTargetingReads(rawPayload);
  if (!p) return null;
  const g =
    typeof p.gender_audience === "string" ? p.gender_audience.trim()
    : typeof p.genderAudience === "string" ? p.genderAudience.trim()
    : "";
  return g || null;
}

/** Region row value: granular locations beat the coarse EU disclosure flag alone. */
export function metaTargetingRegionDisplayLine(rawPayload: unknown): string | null {
  const loc = metaLocationAudienceDetailLabel(rawPayload);
  if (loc) return loc;
  return metaEuRegionDetailLabel(rawPayload);
}

/** “Coming soon › Target Market” — compact scraped targeting when present (no duplication of EU-only vs Region row). */
export function metaTargetMarketFooterLine(rawPayload: unknown): string | null {
  const parts: string[] = [];
  const loc = metaLocationAudienceDetailLabel(rawPayload);
  if (loc) parts.push(loc);
  const age = metaAgeAudienceDetailLabel(rawPayload);
  if (age) parts.push(age);
  const gen = metaGenderAudienceDetailLabel(rawPayload);
  if (gen) parts.push(gen);
  /** EU disclosure only when Geo row has no named locations — Region row separately shows EU fallback. */
  if (!loc) {
    const eu = metaEuRegionDetailLabel(rawPayload);
    if (eu) parts.unshift(eu);
  }
  return parts.length ? parts.join(" · ") : null;
}

/** Link-card headline (“Samba Classic Boots”) — not primary body text */
export function metaTitleFromPayload(rawPayload: unknown): string | null {
  const p = metaPayloadRecord(rawPayload);
  if (!p) return null;
  const linkH = typeof p.linkHeadline === "string" ? p.linkHeadline.trim() : "";
  const h = typeof p.headline === "string" ? p.headline.trim() : "";
  const t = linkH || h;
  return t || null;
}

/** Primary copy above the creative (`desc` / body text in Ad Library snapshot). */
export function metaPrimaryDescriptionFromPayload(rawPayload: unknown): string | null {
  const p = metaPayloadRecord(rawPayload);
  if (!p) return null;
  const d = typeof p.desc === "string" ? p.desc.trim() : "";
  return d || null;
}
