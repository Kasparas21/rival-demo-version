/**
 * Post-sweep lifecycle reconciliation for `scraped_ads.is_active`.
 *
 * Meta: scheduled/manual scrapes are full `status=ACTIVE` sweeps. When a sweep is
 * exhaustive (returned fewer ads than the requested cap), any DB row absent from the
 * sweep is no longer running on Meta → mark killed. Rows that reappear are reactivated.
 *
 * Google / TikTok: their libraries include historical ads, so absence is not a kill
 * signal. Instead recompute `is_active` from each row's own visibility window
 * (`lastShown` / flight dates) so the column stops rotting at `true`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AdsLibraryPlatform, AdsLibraryResponse } from "@/lib/ad-library/api-types";
import {
  isGoogleAdRowActive,
  isMetaAdActive,
  isTikTokAdActive,
} from "@/lib/ad-library/count-active-ads";
import { metaCardForLifecycle } from "@/lib/ad-library/meta-payload-lifecycle";
import { metaLibraryItemLookupKeys } from "@/lib/ad-library/meta-library-item-keys";
import type { GoogleAdRow, MetaAdCard, TikTokAdCard } from "@/lib/ad-library/normalize";
import { stableAdKeyForMeta } from "@/lib/ad-library/stable-ad-keys";
import type { Database } from "@/lib/supabase/types";

const UPDATE_CHUNK = 100;

export type SweepReconcileResult = {
  platform: AdsLibraryPlatform;
  killed: number;
  reactivated: number;
  /** False when the sweep hit its cap — absence can't be proven, so no kill-marking. */
  exhaustive: boolean;
};

type ScrapedRowSlice = {
  id: string;
  stable_ad_key: string;
  is_active: boolean;
  raw_payload: unknown;
};

async function loadRows(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
  dbPlatforms: string[],
): Promise<ScrapedRowSlice[]> {
  const { data, error } = await supabase
    .from("scraped_ads")
    .select("id, stable_ad_key, is_active, raw_payload")
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .in("platform", dbPlatforms);
  if (error) {
    console.error("[reconcileLifecycle] load rows", error.message);
    return [];
  }
  return (data ?? []) as ScrapedRowSlice[];
}

async function bulkSetActive(
  supabase: SupabaseClient<Database>,
  ids: string[],
  isActive: boolean,
): Promise<void> {
  for (let i = 0; i < ids.length; i += UPDATE_CHUNK) {
    const chunk = ids.slice(i, i + UPDATE_CHUNK);
    const { error } = await supabase
      .from("scraped_ads")
      .update({ is_active: isActive })
      .in("id", chunk);
    if (error) console.error("[reconcileLifecycle] bulk update", error.message);
  }
}

function metaReturnedKeySet(ads: MetaAdCard[]): Set<string> {
  const keys = new Set<string>();
  for (const ad of ads) {
    keys.add(stableAdKeyForMeta(ad));
    for (const k of metaLibraryItemLookupKeys(ad)) keys.add(k);
  }
  return keys;
}

async function reconcileMeta(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    competitorId: string;
    ads: MetaAdCard[];
    sweepCap: number | null;
    nowMs: number;
  },
): Promise<SweepReconcileResult> {
  const { userId, competitorId, ads, sweepCap, nowMs } = params;
  const exhaustive = sweepCap != null && ads.length > 0 && ads.length < sweepCap;
  const returnedKeys = metaReturnedKeySet(ads);

  const rows = await loadRows(supabase, userId, competitorId, ["meta"]);
  const toKill: string[] = [];
  const toReactivate: string[] = [];

  for (const row of rows) {
    const returned = returnedKeys.has(row.stable_ad_key);
    if (returned) {
      /** Reappeared in an ACTIVE sweep and its payload agrees → running again. */
      const card = metaCardForLifecycle(row.raw_payload, nowMs);
      const payloadActive = card ? isMetaAdActive(card, nowMs) : true;
      if (!row.is_active && payloadActive) toReactivate.push(row.id);
      continue;
    }
    /** Absent from an exhaustive ACTIVE sweep → not running on Meta anymore. */
    if (exhaustive && row.is_active) toKill.push(row.id);
  }

  await bulkSetActive(supabase, toKill, false);
  await bulkSetActive(supabase, toReactivate, true);

  return { platform: "meta", killed: toKill.length, reactivated: toReactivate.length, exhaustive };
}

async function reconcileFromPayloadWindows(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    competitorId: string;
    platform: "google" | "tiktok";
    nowMs: number;
  },
): Promise<SweepReconcileResult> {
  const { userId, competitorId, platform, nowMs } = params;
  const dbPlatforms = platform === "google" ? ["google", "youtube"] : ["tiktok"];
  const rows = await loadRows(supabase, userId, competitorId, dbPlatforms);

  const toKill: string[] = [];
  const toReactivate: string[] = [];

  for (const row of rows) {
    const raw = row.raw_payload;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const active =
      platform === "google"
        ? isGoogleAdRowActive(raw as GoogleAdRow, nowMs)
        : isTikTokAdActive(raw as TikTokAdCard, nowMs);
    if (active === row.is_active) continue;
    if (active) toReactivate.push(row.id);
    else toKill.push(row.id);
  }

  await bulkSetActive(supabase, toKill, false);
  await bulkSetActive(supabase, toReactivate, true);

  return { platform, killed: toKill.length, reactivated: toReactivate.length, exhaustive: true };
}

/** Sweep caps by platform as requested from the scrapers (used to detect truncation). */
export type SweepCaps = Partial<Record<AdsLibraryPlatform, number>>;

export async function reconcileLifecycleAfterSweep(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    competitorId: string;
    platformsScraped: Iterable<AdsLibraryPlatform>;
    out: AdsLibraryResponse;
    sweepCaps?: SweepCaps;
    nowMs?: number;
  },
): Promise<SweepReconcileResult[]> {
  const { userId, competitorId, out, sweepCaps } = params;
  const nowMs = params.nowMs ?? Date.now();
  const results: SweepReconcileResult[] = [];

  for (const platform of params.platformsScraped) {
    try {
      if (platform === "meta") {
        if (out.meta.error != null) continue;
        results.push(
          await reconcileMeta(supabase, {
            userId,
            competitorId,
            ads: out.meta.ads ?? [],
            sweepCap: sweepCaps?.meta ?? null,
            nowMs,
          }),
        );
      } else if (platform === "google") {
        if (out.google.error != null) continue;
        results.push(
          await reconcileFromPayloadWindows(supabase, { userId, competitorId, platform: "google", nowMs }),
        );
      } else if (platform === "tiktok") {
        if (out.tiktok.error != null) continue;
        results.push(
          await reconcileFromPayloadWindows(supabase, { userId, competitorId, platform: "tiktok", nowMs }),
        );
      }
    } catch (e) {
      console.error("[reconcileLifecycle]", platform, e);
    }
  }

  if (results.some((r) => r.killed > 0 || r.reactivated > 0)) {
    console.info(
      "[reconcileLifecycle]",
      results.map((r) => `${r.platform}: -${r.killed}/+${r.reactivated}${r.exhaustive ? "" : " (capped)"}`).join(", "),
    );
  }

  return results;
}

/**
 * Flip merged Meta cache cards that were absent from an exhaustive ACTIVE sweep to
 * inactive so library cards match the DB (`ended` at detection time when Meta gave
 * no end date). Cards present in the sweep keep the fresh incoming lifecycle.
 */
export function applyMetaSweepToMergedCards(
  merged: MetaAdCard[],
  incoming: MetaAdCard[],
  sweepCap: number | null,
  nowMs = Date.now(),
): MetaAdCard[] {
  const exhaustive = sweepCap != null && incoming.length > 0 && incoming.length < sweepCap;
  if (!exhaustive) return merged;
  const returnedKeys = metaReturnedKeySet(incoming);
  const nowSec = Math.floor(nowMs / 1000);
  return merged.map((card) => {
    if (returnedKeys.has(stableAdKeyForMeta(card))) return card;
    if (card.isActive === false) return card;
    return {
      ...card,
      isActive: false,
      endedAt: card.endedAt != null && Number.isFinite(card.endedAt) && card.endedAt > 0 ? card.endedAt : nowSec,
    };
  });
}
