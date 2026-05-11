import { normalizePlatform } from "@/lib/strategy-overview/brand-scale-score";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";

import { LIVE_AD_RECENCY_DAYS } from "@/lib/spend-estimator/constants";

/** Row shape for distinct-live logic (scraped_ads / footprint / derivation). */
export type RowWithCreativePayload = {
  id: string;
  platform: string;
  first_seen_at: string;
  last_seen_at: string;
  is_active?: boolean;
  raw_payload?: unknown;
};

export type LiveCreativeGroup<T extends RowWithCreativePayload = RowWithCreativePayload> = {
  stableKey: string;
  representative: T;
  /** Earliest first_seen across duplicate rows for this creative. */
  firstSeenMinMs: number;
  /** Latest last_seen across duplicate rows. */
  lastSeenMaxMs: number;
};

/**
 * Stable key for deduping rows into one logical creative per platform.
 * Falls back to `platform + row uuid` when payload has no id (keeps rows distinct).
 */
export function extractStableCreativeKey(platform: string, rawPayload: unknown, rowId: string): string {
  const pl = platform.toLowerCase().trim();
  if (rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)) {
    const o = rawPayload as Record<string, unknown>;
    const id =
      typeof o.id === "string" && o.id.trim()
        ? o.id.trim()
        : typeof o.ad_archive_id === "string" && o.ad_archive_id.trim()
          ? o.ad_archive_id.trim()
          : typeof o.adArchiveId === "string" && o.adArchiveId.trim()
            ? o.adArchiveId.trim()
            : undefined;
    if (id) return `${pl}:${id}`;
  }
  return `${pl}:row:${rowId}`;
}

/** Creative is "live" if any source row is active in DB or was seen recently. */
export function isCreativeLive(
  row: Pick<RowWithCreativePayload, "is_active" | "last_seen_at">,
  nowMs: number,
  recencyDays: number = LIVE_AD_RECENCY_DAYS
): boolean {
  if (row.is_active === true) return true;
  const last = Date.parse(row.last_seen_at);
  if (!Number.isFinite(last)) return false;
  return last >= nowMs - recencyDays * 86_400_000;
}

function groupByPlatformAndKey<T extends RowWithCreativePayload>(rows: T[]): Map<StrategyPlatform, Map<string, T[]>> {
  const m = new Map<StrategyPlatform, Map<string, T[]>>();
  for (const row of rows) {
    const pl = normalizePlatform(row.platform);
    if (!pl) continue;
    const key = extractStableCreativeKey(row.platform, row.raw_payload, row.id);
    if (!m.has(pl)) m.set(pl, new Map());
    const inner = m.get(pl)!;
    if (!inner.has(key)) inner.set(key, []);
    inner.get(key)!.push(row);
  }
  return m;
}

/**
 * Groups rows into distinct creatives per platform, keeping only creatives that are "live"
 * (is_active OR last_seen within recency window).
 */
export function liveCreativeGroupsPerPlatform<T extends RowWithCreativePayload>(
  rows: T[],
  nowMs: number = Date.now(),
  recencyDays: number = LIVE_AD_RECENCY_DAYS
): Map<StrategyPlatform, LiveCreativeGroup<T>[]> {
  const grouped = groupByPlatformAndKey(rows);
  const out = new Map<StrategyPlatform, LiveCreativeGroup<T>[]>();

  for (const [pl, inner] of grouped) {
    const groups: LiveCreativeGroup<T>[] = [];
    for (const [stableKey, bucket] of inner) {
      const live = bucket.some((r) => isCreativeLive(r, nowMs, recencyDays));
      if (!live) continue;

      let firstMin = Infinity;
      let lastMax = -Infinity;
      let rep = bucket[0]!;
      for (const r of bucket) {
        const f = Date.parse(r.first_seen_at);
        const l = Date.parse(r.last_seen_at);
        if (Number.isFinite(f)) firstMin = Math.min(firstMin, f);
        if (Number.isFinite(l)) lastMax = Math.max(lastMax, l);
        const repL = Date.parse(rep.last_seen_at);
        if (Number.isFinite(l) && (!Number.isFinite(repL) || l >= repL)) rep = r;
      }

      const f0 = Number.isFinite(firstMin) ? firstMin : Date.parse(rep.first_seen_at);
      const l0 = Number.isFinite(lastMax) && lastMax >= 0 ? lastMax : Date.parse(rep.last_seen_at);

      groups.push({
        stableKey,
        representative: rep,
        firstSeenMinMs: Number.isFinite(f0) ? f0 : Date.parse(rep.first_seen_at),
        lastSeenMaxMs: Number.isFinite(l0) ? l0 : Date.parse(rep.last_seen_at),
      });
    }
    out.set(pl, groups);
  }
  return out;
}

/** Count distinct live creatives per platform (for assertions / metrics). */
export function distinctLiveCountsByPlatform<T extends RowWithCreativePayload>(
  rows: T[],
  nowMs?: number,
  recencyDays?: number
): Map<StrategyPlatform, number> {
  const m = liveCreativeGroupsPerPlatform(rows, nowMs ?? Date.now(), recencyDays ?? LIVE_AD_RECENCY_DAYS);
  const out = new Map<StrategyPlatform, number>();
  for (const [pl, g] of m) out.set(pl, g.length);
  return out;
}
