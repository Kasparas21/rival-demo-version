import type { SupabaseClient } from "@supabase/supabase-js";

import { hostFromLandingPageUrl, landingPageGroupKey } from "@/lib/landing-pages/normalize-url";
import type { Database } from "@/lib/supabase/types";

export type LandingPageSnapshotStatus = {
  hero_screenshot_url: string | null;
  screenshot_url: string;
  status: "ok" | "blocked";
  taken_at: string;
  inheritedBlocked?: boolean;
};

export const HOST_BLOCKED_MESSAGE =
  "This competitor's website uses anti-bot protection, so we can't take automated screenshots or track page changes.";

export function normalizeHost(host: string): string {
  return host.replace(/^www\./i, "").toLowerCase();
}

export function hostKeyFromUrl(url: string): string | null {
  const host = hostFromLandingPageUrl(url);
  return host ? normalizeHost(host) : null;
}

/** Apex URL for a host, e.g. `https://bite.lt` for any bite.lt path. */
export function apexLandingPageGroupKey(url: string): string | null {
  const host = hostFromLandingPageUrl(url);
  if (!host) return null;
  return landingPageGroupKey(`https://${host}`);
}

export function isApexLandingPageGroupKey(groupKey: string): boolean {
  return apexLandingPageGroupKey(groupKey) === groupKey;
}

/** Hostnames that have at least one blocked snapshot in the map. */
export function buildBlockedHostsIndex(
  snapshotByGroupKey: Map<string, LandingPageSnapshotStatus>,
): Set<string> {
  const blockedHosts = new Set<string>();
  for (const [groupKey, snap] of snapshotByGroupKey) {
    if (snap.status !== "blocked") continue;
    const hostKey = hostKeyFromUrl(groupKey);
    if (hostKey) blockedHosts.add(hostKey);
  }
  return blockedHosts;
}

function firstBlockedSnapshotOnHost(
  hostKey: string,
  snapshotByGroupKey: Map<string, LandingPageSnapshotStatus>,
): LandingPageSnapshotStatus | null {
  for (const [groupKey, snap] of snapshotByGroupKey) {
    if (snap.status !== "blocked") continue;
    if (hostKeyFromUrl(groupKey) === hostKey) return snap;
  }
  return null;
}

/**
 * If any URL on the same host was blocked, all paths on that host inherit blocked without a new capture.
 */
export function resolveSnapshotWithBlockedInheritance(
  groupKey: string,
  snapshotByGroupKey: Map<string, LandingPageSnapshotStatus>,
  blockedHosts?: Set<string>,
): LandingPageSnapshotStatus | null {
  const own = snapshotByGroupKey.get(groupKey) ?? null;
  if (own?.status === "ok") return own;
  if (own?.status === "blocked") return own;

  const hostKey = hostKeyFromUrl(groupKey);
  if (!hostKey) return own;

  const hosts = blockedHosts ?? buildBlockedHostsIndex(snapshotByGroupKey);
  if (!hosts.has(hostKey)) return own;

  const source = firstBlockedSnapshotOnHost(hostKey, snapshotByGroupKey);
  if (!source) return own;

  return {
    hero_screenshot_url: null,
    screenshot_url: source.screenshot_url,
    status: "blocked",
    taken_at: source.taken_at,
    inheritedBlocked: true,
  };
}

export function isHostBlockedInSnapshotMap(
  url: string,
  snapshotByGroupKey: Map<string, LandingPageSnapshotStatus>,
): boolean {
  const hostKey = hostKeyFromUrl(url);
  if (!hostKey) return false;
  return buildBlockedHostsIndex(snapshotByGroupKey).has(hostKey);
}

export async function findBlockedHostSnapshot(
  groupKeysOnHost: string[],
  lookup: (groupKey: string) => Promise<LandingPageSnapshotStatus | null | undefined>,
): Promise<LandingPageSnapshotStatus | null> {
  for (const key of groupKeysOnHost) {
    const snap = await lookup(key);
    if (snap?.status === "blocked") {
      return {
        hero_screenshot_url: null,
        screenshot_url: snap.screenshot_url,
        status: "blocked",
        taken_at: snap.taken_at,
        inheritedBlocked: true,
      };
    }
  }
  return null;
}

type Supabase = SupabaseClient<Database>;

/** Load latest snapshots per URL group for a competitor (batched). */
export async function loadSnapshotMapForCompetitor(
  supabase: Supabase,
  competitorId: string,
  userId: string,
): Promise<Map<string, LandingPageSnapshotStatus>> {
  const snapshotByGroupKey = new Map<string, LandingPageSnapshotStatus>();

  const { data: pages } = await supabase
    .from("landing_pages")
    .select("id, url")
    .eq("competitor_id", competitorId)
    .eq("user_id", userId);

  if (!pages?.length) return snapshotByGroupKey;

  const pageIdToKey = new Map<string, string>();
  for (const page of pages) {
    const key = landingPageGroupKey(page.url);
    if (key) pageIdToKey.set(page.id, key);
  }

  const pageIds = pages.map((p) => p.id);
  const { data: snapshots } = await supabase
    .from("landing_page_snapshots")
    .select("landing_page_id, screenshot_url, hero_screenshot_url, status, taken_at")
    .in("landing_page_id", pageIds)
    .order("taken_at", { ascending: false });

  const latestByPageId = new Map<string, (typeof snapshots extends (infer T)[] | null ? T : never)>();
  for (const snap of snapshots ?? []) {
    if (!latestByPageId.has(snap.landing_page_id)) {
      latestByPageId.set(snap.landing_page_id, snap);
    }
  }

  for (const [pageId, snap] of latestByPageId) {
    const groupKey = pageIdToKey.get(pageId);
    if (!groupKey || snapshotByGroupKey.has(groupKey)) continue;
    snapshotByGroupKey.set(groupKey, {
      hero_screenshot_url: snap.hero_screenshot_url,
      screenshot_url: snap.screenshot_url,
      status: snap.status === "blocked" ? "blocked" : "ok",
      taken_at: snap.taken_at,
    });
  }

  return snapshotByGroupKey;
}

/** Load snapshot map + check if URL's host is blocked for a competitor. */
export async function loadSnapshotMapAndHostBlocked(
  supabase: Supabase,
  competitorId: string,
  userId: string,
  url: string,
): Promise<{
  snapshotByGroupKey: Map<string, LandingPageSnapshotStatus>;
  hostBlocked: boolean;
}> {
  const snapshotByGroupKey = await loadSnapshotMapForCompetitor(supabase, competitorId, userId);
  const hostBlocked = isHostBlockedInSnapshotMap(url, snapshotByGroupKey);
  return { snapshotByGroupKey, hostBlocked };
}

export async function isHostBlockedForCompetitor(
  supabase: Supabase,
  competitorId: string,
  userId: string,
  url: string,
): Promise<boolean> {
  const { hostBlocked } = await loadSnapshotMapAndHostBlocked(supabase, competitorId, userId, url);
  return hostBlocked;
}
