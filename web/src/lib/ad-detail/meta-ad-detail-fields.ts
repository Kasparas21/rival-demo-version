/** Meta Ads Library fields for the competitor ad detail drawer (payload → labels). */

import { formatImpressionsDetailLabel } from "@/lib/ad-detail/detail-field-format";

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

/** Step into nested `{}` and `{}` arrays under `[…]` (actors bury transparency blobs off the main tree). */
function descendMetaTreesForWalking(v: unknown, visitRecord: (o: Record<string, unknown>) => void): void {
  if (!v || typeof v !== "object") return;
  if (Array.isArray(v)) {
    for (const x of v) {
      descendMetaTreesForWalking(x, visitRecord);
    }
    return;
  }
  visitRecord(v as Record<string, unknown>);
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
      descendMetaTreesForWalking(v, dfs);
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

/**
 * Walk scrape JSON for impressions / reach labels (EU totals, bands, Library `impressions_text`, …).
 * Same DFS order idiom as transparency harvest — last collected match wins among siblings at depth order.
 */
export function harvestDeepMetaReachImpressionsCandidate(rawPayload: unknown): string | null {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return null;
  const root = rawPayload as Record<string, unknown>;
  const vals: string[] = [];
  const seen = new WeakSet<object>();

  function pushScalar(v: unknown): void {
    if (typeof v === "number" && Number.isFinite(v)) vals.push(String(Math.trunc(v)));
    else if (typeof v === "string" && v.trim()) vals.push(v.trim());
  }

  function dfs(node: Record<string, unknown>): void {
    if (seen.has(node)) return;
    seen.add(node);
    for (const v of Object.values(node)) {
      descendMetaTreesForWalking(v, dfs);
    }

    pushScalar(node.impressionsRange ?? node.impressions_range);
    pushScalar(node.impressions_text ?? node.impressionsText);
    pushScalar(node.estimated_reach ?? node.estimatedReach ?? node.estimated_audience ?? node.estimatedAudience);

    pushScalar(
      node.total_reach ??
        node.totalReach ??
        node.eu_total_reach ??
        node.euTotalReach ??
        node.total_eu_reach ??
        node.totalEuReach
    );

    const reachPeek = node.reach ?? node.Reach ?? node.eu_reach ?? node.euReach;
    if (reachPeek && typeof reachPeek === "object" && !Array.isArray(reachPeek)) {
      const o = reachPeek as Record<string, unknown>;
      pushScalar(o.totalEU ?? o.totalEu ?? o.total_eu ?? o.euTotal ?? o.eu_total ?? o.value);
      pushScalar(o.label ?? o.summary);
    }

    const im = node.impressions_with_index ?? node.impressionsWithIndex;
    if (im && typeof im === "object" && !Array.isArray(im)) {
      const io = im as Record<string, unknown>;
      pushScalar(io.impressions_text ?? io.impressionsText);
      const lb = io.lower_bound ?? io.lowerBound;
      const ub = io.upper_bound ?? io.upperBound;
      const l =
        typeof lb === "number" && Number.isFinite(lb) ? String(Math.trunc(lb))
        : typeof lb === "string" ? lb.trim()
        : "";
      const r =
        typeof ub === "number" && Number.isFinite(ub) ? String(Math.trunc(ub))
        : typeof ub === "string" ? ub.trim()
        : "";
      if (l && r && l !== r) vals.push(`${l}–${r}`);
      else pushScalar(l || r);
    }
  }

  dfs(root);
  return vals.length ? vals[vals.length - 1]! : null;
}

/** Detail-tab “Impressions” from scrape totals, EU reach, Library bands / text, … */
export function metaTotalReachImpressionsLabel(rawPayload: unknown): string | null {
  const raw = harvestDeepMetaReachImpressionsCandidate(rawPayload);
  if (!raw?.trim()) return null;
  return formatImpressionsDetailLabel(raw.trim());
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

/** Explicit `targets_eu` disclosure when scraper emits it (`true`, `false`, or unknown). */
export function metaTargetsEuExplicit(rawPayload: unknown): boolean | null {
  const p = metaRecordForTargetingReads(rawPayload);
  if (!p) return null;
  const a = p.targets_eu ?? p.targetsEu;
  if (typeof a === "boolean") return a;
  if (a === 1 || a === "1") return true;
  if (a === 0 || a === "0") return false;
  if (typeof a === "string") {
    const t = a.trim().toLowerCase();
    if (t === "true") return true;
    if (t === "false") return false;
  }
  return null;
}

export type MetaLocationAudienceParsedRow = {
  name: string;
  excluded?: boolean;
  /** Transparency `type`, e.g. `countries`. */
  type?: string;
};

/** Deduped `location_audience` entries for drawer UI / labels. */
export function metaLocationAudienceRows(rawPayload: unknown): MetaLocationAudienceParsedRow[] {
  const p = metaRecordForTargetingReads(rawPayload);
  if (!p) return [];
  const raw = p.location_audience ?? p.locationAudience;
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const out: MetaLocationAudienceParsedRow[] = [];
  const seen = new Set<string>();

  for (const row of raw) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const o = row as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    if (!name) continue;
    const excluded = o.excluded === true;
    const type = typeof o.type === "string" ? o.type.trim() : undefined;
    const key = `${excluded ? 1 : 0}|${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      ...(excluded ? { excluded: true } : {}),
      ...(type ? { type } : {}),
    });
  }

  return out;
}

/** Human-readable geography from `location_audience` rows when the scraper exposes them. */
export function metaLocationAudienceDetailLabel(rawPayload: unknown): string | null {
  const rows = metaLocationAudienceRows(rawPayload);
  if (!rows.length) return null;
  const segments = rows.map((r) => (r.excluded ? `Exclude ${r.name}` : r.name));
  return segments.join(" · ");
}

/** e.g. `18–44` from `age_audience.min/max`. */
export function metaAgeAudienceDetailLabel(rawPayload: unknown): string | null {
  const p = metaRecordForTargetingReads(rawPayload);
  if (!p) return null;
  const raw = p.age_audience ?? p.ageAudience;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const min =
    typeof o.min === "number" && Number.isFinite(o.min) ? Math.trunc(o.min)
    : typeof o.min === "string" && /^-?\d+$/.test(o.min.trim()) ? parseInt(o.min.trim(), 10)
    : null;
  const max =
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

/** Ad Library scrape key(s) — EU / demographic reach slices. */
const META_REACH_BREAKDOWN_KEYS = [
  "age_country_gender_reach_breakdown",
  "ageCountryGenderReachBreakdown",
] as const;

function pickMetaFirstString(o: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function metaFiniteNumber(u: unknown): number | null {
  if (typeof u === "number" && Number.isFinite(u)) return u;
  if (typeof u === "string") {
    const t = u.trim().replace(/,/g, "");
    if (t && /^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  }
  return null;
}

function formatMetaReachCount(n: number): string {
  return Number.isInteger(n) ? String(Math.trunc(n)) : String(n);
}

/** One demographics bucket for tabular drawer UI (Male / Female / Unknown reach). */
export type MetaReachGenderCountRow = {
  ageRange: string;
  female: number | null;
  male: number | null;
  unknown: number | null;
};

function reachGenderCountRowSig(r: MetaReachGenderCountRow): string {
  return `${r.ageRange}\t${r.female ?? "x"}\t${r.male ?? "x"}\t${r.unknown ?? "x"}`;
}

/** Sort helper: canonical age-band row order youngest → oldest, `Unknown` bucket last */
function metaReachAgeRangeSortTuple(ageRange: string): [number, number, number] {
  const raw = ageRange.trim();
  if (!raw) return [501_000, 0, 0];
  const lower = raw.toLowerCase();
  if (lower === "unknown") return [9_000_000, 0, 0];

  const compact = raw.replace(/\s+/g, "");
  const plus = /^(\d+)\+$/i.exec(compact);
  if (plus) {
    const n = parseInt(plus[1], 10);
    /** `65+` sorts after the last closed band (e.g. 55–64) */
    return [n, 999_999, 1];
  }

  const band = /^(\d+)[\-–](\d+)$/i.exec(compact);
  if (band) {
    return [parseInt(band[1], 10), parseInt(band[2], 10), 0];
  }

  const single = /^(\d+)$/i.exec(compact);
  if (single) {
    const n = parseInt(single[1], 10);
    return [n, n, 0];
  }

  return [500_000, 0, 0];
}

function compareMetaReachCountRowsYoungestFirst(a: MetaReachGenderCountRow, b: MetaReachGenderCountRow): number {
  const ta = metaReachAgeRangeSortTuple(a.ageRange);
  const tb = metaReachAgeRangeSortTuple(b.ageRange);
  if (ta[0] !== tb[0]) return ta[0] - tb[0];
  if (ta[1] !== tb[1]) return ta[1] - tb[1];
  return ta[2] - tb[2];
}

function sortMetaReachGenderCountRows(rows: MetaReachGenderCountRow[]): MetaReachGenderCountRow[] {
  return [...rows].sort(compareMetaReachCountRowsYoungestFirst);
}

/**
 * Parses a scrape chunk into a tabular demographics row when the payload is age × gender counts.
 * Returns null for percentage-only rows, reach strings, or shapes that belong in prose lines.
 */
function parseReachChunkToCountRow(chunk: unknown): MetaReachGenderCountRow | null {
  if (!chunk || typeof chunk !== "object" || Array.isArray(chunk)) return null;
  const o = chunk as Record<string, unknown>;

  const female = metaFiniteNumber(o.female);
  const male = metaFiniteNumber(o.male);
  const unknown = metaFiniteNumber(o.unknown ?? o.gender_unknown ?? o.unknown_gender);

  const ageRaw = pickMetaFirstString(o, ["age_range", "ageRange", "age", "age_bucket", "ageBucket"]);

  const pct = pickMetaFirstString(o, ["percentage", "percent", "pct", "share"]);
  const loneGenderTag = pickMetaFirstString(o, ["gender", "Gender"]);

  /** Percentage-share row without discrete gender counts → keep prose line */
  if (pct != null && female === null && male === null && unknown === null && !ageRaw?.trim()) {
    return null;
  }
  /** Label-only demographics row → prose */
  if (loneGenderTag && female === null && male === null && unknown === null) {
    return null;
  }

  const ageRange = ageRaw?.trim() ?? "";
  if (!ageRange) return null;

  return { ageRange, female, male, unknown };
}

/** One row from `age_country_gender_reach_breakdown` (or nested `age_gender_breakdowns`). */
function formatMetaFlatReachRow(chunk: unknown): string | null {
  if (typeof chunk === "string") {
    const t = chunk.trim();
    return t || null;
  }
  if (!chunk || typeof chunk !== "object" || Array.isArray(chunk)) return null;
  const o = chunk as Record<string, unknown>;

  const country = pickMetaFirstString(o, ["country", "country_code", "country_name", "Country"]);
  const age = pickMetaFirstString(o, ["age_range", "ageRange", "age", "age_bucket", "ageBucket"]);
  const gender = pickMetaFirstString(o, ["gender", "Gender"]);

  const female = metaFiniteNumber(o.female);
  const male = metaFiniteNumber(o.male);
  const unknown = metaFiniteNumber(o.unknown ?? o.gender_unknown ?? o.unknown_gender);

  const reach = pickMetaFirstString(o, [
    "reach",
    "estimated_reach",
    "estimatedReach",
    "accounts_reached",
    "accountsReached",
  ]);
  const pct = pickMetaFirstString(o, ["percentage", "percent", "pct", "share"]);

  const parts: string[] = [];
  if (country) parts.push(country);
  if (age) parts.push(age);
  if (gender) parts.push(gender);

  const genderBits: string[] = [];
  if (female != null) genderBits.push(`Female ${formatMetaReachCount(female)}`);
  if (male != null) genderBits.push(`Male ${formatMetaReachCount(male)}`);
  if (unknown != null) genderBits.push(`Unknown ${formatMetaReachCount(unknown)}`);
  if (genderBits.length) parts.push(genderBits.join(" · "));

  if (reach) parts.push(`Reach ${reach}`);
  if (pct) parts.push(pct);

  if (!parts.length) {
    const skip = new Set(["age_gender_breakdowns", "ageGenderBreakdowns"]);
    const entries = Object.entries(o).filter(
      ([k, v]) => !skip.has(k) && (typeof v === "string" || typeof v === "number")
    );
    if (entries.length > 0 && entries.length <= 8) {
      return entries.map(([k, v]) => `${k}: ${String(v)}`).join(" · ");
    }
  }

  return parts.length ? parts.join(" · ") : null;
}

function joinMetaCountryAndTail(countryHint: string | null, tail: string | null): string | null {
  const t = tail?.trim() ?? "";
  const c = countryHint?.trim() ?? "";
  if (c && t) return `${c} · ${t}`;
  if (t) return t;
  if (c) return c;
  return null;
}

function expandMetaReachBreakdownItem(item: unknown): string[] {
  if (typeof item === "string") {
    const t = item.trim();
    return t ? [t] : [];
  }
  if (!item || typeof item !== "object" || Array.isArray(item)) return [];

  const o = item as Record<string, unknown>;
  const innerRaw = o.age_gender_breakdowns ?? o.ageGenderBreakdowns;
  const countryHint = pickMetaFirstString(o, ["country", "country_code", "country_name", "Country"]);

  if (Array.isArray(innerRaw)) {
    if (innerRaw.length === 0) return countryHint ? [countryHint] : [];
    const lines: string[] = [];
    for (const chunk of innerRaw) {
      const formatted = formatMetaFlatReachRow(chunk);
      const merged = joinMetaCountryAndTail(countryHint, formatted);
      if (merged) lines.push(merged);
    }
    return lines;
  }

  const single = formatMetaFlatReachRow(o);
  return single ? [single] : [];
}

export function gatherMetaReachBreakdownEntries(rawPayload: unknown): unknown[] {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return [];
  const root = rawPayload as Record<string, unknown>;
  const out: unknown[] = [];
  const seen = new Set<string>();
  const seenNodes = new WeakSet<object>();

  function pushDeduped(entry: unknown) {
    if (entry === null || entry === undefined) return;
    if (typeof entry === "string") {
      const t = entry.trim();
      if (!t) return;
      const sig = `s:${t}`;
      if (!seen.has(sig)) {
        seen.add(sig);
        out.push(entry);
      }
      return;
    }
    if (typeof entry !== "object" || Array.isArray(entry)) return;
    let sig = "";
    try {
      sig = JSON.stringify(entry, Object.keys(entry as Record<string, unknown>).sort());
    } catch {
      sig = `o:${Math.random()}`;
    }
    if (!seen.has(sig)) {
      seen.add(sig);
      out.push(entry);
    }
  }

  function dfs(node: Record<string, unknown>): void {
    if (seenNodes.has(node)) return;
    seenNodes.add(node);
    for (const v of Object.values(node)) {
      descendMetaTreesForWalking(v, dfs);
    }
    for (const key of META_REACH_BREAKDOWN_KEYS) {
      const arr = node[key];
      if (!Array.isArray(arr)) continue;
      for (const item of arr) pushDeduped(item);
    }
  }

  dfs(root);
  return out;
}

export type MetaReachBreakdownDrawerGroup = {
  /** Country ISO / name when present — else `"Estimated reach"`. */
  headline: string;
  /** Fallback prose when data is not a clean demographics matrix. */
  lines: string[];
  /** Parsed age × gender counts — drives the readable table in the Region drawer when present. */
  countRows?: MetaReachGenderCountRow[];
};

type DrawerGroupAcc = {
  lines: string[];
  countRows: MetaReachGenderCountRow[];
};

function mergeMetaReachDrawerGroups(groups: MetaReachBreakdownDrawerGroup[]): MetaReachBreakdownDrawerGroup[] {
  const m = new Map<string, DrawerGroupAcc>();

  for (const g of groups) {
    const h = g.headline.trim() || "Estimated reach";
    const prev = m.get(h) ?? { lines: [], countRows: [] };

    const nextLines = [...prev.lines];
    for (const ln of g.lines) {
      const t = ln.trim();
      if (t && !nextLines.includes(t)) nextLines.push(t);
    }

    const nextCountRows = [...prev.countRows];
    if (g.countRows?.length) {
      const seenSig = new Set(nextCountRows.map(reachGenderCountRowSig));
      for (const r of g.countRows) {
        const sig = reachGenderCountRowSig(r);
        if (seenSig.has(sig)) continue;
        seenSig.add(sig);
        nextCountRows.push(r);
      }
    }

    m.set(h, { lines: nextLines, countRows: nextCountRows });
  }

  const out: MetaReachBreakdownDrawerGroup[] = [];
  for (const [headline, acc] of m) {
    out.push({
      headline,
      lines: acc.lines,
      ...(acc.countRows.length > 0 ? { countRows: sortMetaReachGenderCountRows(acc.countRows) } : {}),
    });
  }
  return out;
}

function expandReachEntryToDrawerGroup(entry: unknown): MetaReachBreakdownDrawerGroup | null {
  if (typeof entry === "string") {
    const t = entry.trim();
    return t ? { headline: "Breakdown", lines: [t] } : null;
  }
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;

  const o = entry as Record<string, unknown>;
  const countryHint =
    pickMetaFirstString(o, ["country", "country_code", "country_name", "Country"]) ?? "Estimated reach";

  const innerRaw = o.age_gender_breakdowns ?? o.ageGenderBreakdowns;
  if (Array.isArray(innerRaw) && innerRaw.length > 0) {
    const countRowsAcc: MetaReachGenderCountRow[] = [];
    for (const chunk of innerRaw) {
      const parsed = parseReachChunkToCountRow(chunk);
      if (!parsed) {
        countRowsAcc.length = 0;
        break;
      }
      countRowsAcc.push(parsed);
    }
    if (countRowsAcc.length === innerRaw.length) {
      return {
        headline: countryHint,
        lines: [],
        countRows: sortMetaReachGenderCountRows(countRowsAcc),
      };
    }

    const lines: string[] = [];
    const lineSeenLocal = new Set<string>();
    for (const chunk of innerRaw) {
      const formatted = formatMetaFlatReachRow(chunk);
      if (!formatted?.trim()) continue;
      const lt = formatted.trim();
      if (lineSeenLocal.has(lt)) continue;
      lineSeenLocal.add(lt);
      lines.push(lt);
    }
    return lines.length ? { headline: countryHint, lines } : null;
  }

  const tabularFlat = parseReachChunkToCountRow(o);
  if (tabularFlat) {
    return { headline: countryHint, lines: [], countRows: [tabularFlat] };
  }

  const single = formatMetaFlatReachRow(o);
  return single?.trim() ? { headline: countryHint, lines: [single.trim()] } : null;
}

/**
 * Parsed age/gender reach rows grouped under each country heading (Region drawer expandable panel).
 */
export function metaReachBreakdownDrawerGroups(rawPayload: unknown): MetaReachBreakdownDrawerGroup[] {
  const groups = gatherMetaReachBreakdownEntries(rawPayload)
    .map(expandReachEntryToDrawerGroup)
    .filter(
      (g): g is MetaReachBreakdownDrawerGroup =>
        g != null && ((g.countRows?.length ?? 0) > 0 || g.lines.length > 0)
    );
  return mergeMetaReachDrawerGroups(groups);
}

/**
 * Flattened bullet lines from `age_country_gender_reach_breakdown` (any nesting path in the scrape JSON).
 */
export function metaReachBreakdownDisplayLines(rawPayload: unknown): string[] {
  const raw = gatherMetaReachBreakdownEntries(rawPayload);
  const lines: string[] = [];
  const lineSeen = new Set<string>();
  for (const item of raw) {
    for (const line of expandMetaReachBreakdownItem(item)) {
      const t = line.trim();
      if (!t || lineSeen.has(t)) continue;
      lineSeen.add(t);
      lines.push(t);
    }
  }
  return lines;
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
