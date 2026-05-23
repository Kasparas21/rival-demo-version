import { COMPARISON_PLATFORM_ORDER } from "@/components/comparison/platform-icon";
export { PLATFORM_LABELS, platformLabel } from "@/lib/platforms/platform-label";

import type { TimelineAd, TimelineSort, TimelineTick, TimelineZoom } from "./timeline-types";

export const DAY_MS = 24 * 60 * 60 * 1000;

const ALL_PLATFORMS = [...COMPARISON_PLATFORM_ORDER, "youtube", "microsoft"] as const;

export function isBrandBidAngle(angle: string | null | undefined): boolean {
  const a = (angle ?? "").toLowerCase();
  return a.includes("brand_name_only") || a.includes("brand_awareness") || a.includes("brand name only");
}

export function displayLifespanDays(ad: TimelineAd, nowMs: number): number {
  const endIso = ad.is_killed ? ad.last_seen_at : new Date(nowMs).toISOString();
  return computeLifespanDays(ad.first_seen_at, endIso);
}

export function computeLifespanDays(firstSeenAt: string, lastSeenAt: string): number {
  const start = new Date(firstSeenAt).getTime();
  const end = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.floor((end - start) / DAY_MS));
}

/** Effective end for bar: active ads run through "today" clamped to view. */
export function effectiveBarEndMs(ad: TimelineAd, viewEnd: number, nowMs: number): number {
  if (!ad.is_killed) {
    return Math.min(viewEnd, nowMs);
  }
  return new Date(ad.last_seen_at).getTime();
}

export type BarTone = "winner_active" | "active" | "killed_recent" | "killed_old" | "brand_bid";

export function barToneForAd(ad: TimelineAd, nowMs: number): BarTone {
  if (isBrandBidAngle(ad.ai_extracted_angle)) return "brand_bid";
  const lastMs = new Date(ad.last_seen_at).getTime();
  const firstMs = new Date(ad.first_seen_at).getTime();
  const runningDays = ad.is_killed
    ? Math.max(0, Math.floor((lastMs - firstMs) / DAY_MS))
    : Math.max(0, Math.floor((nowMs - firstMs) / DAY_MS));
  const daysSinceKilled = ad.is_killed ? (nowMs - lastMs) / DAY_MS : 0;

  if (!ad.is_killed) {
    if (ad.is_winner || runningDays >= 60) return "winner_active";
    return "active";
  }
  if (daysSinceKilled <= 30) return "killed_recent";
  return "killed_old";
}

export function barToneClasses(tone: BarTone): string {
  switch (tone) {
    case "winner_active":
      return "bg-slate-800 ring-1 ring-slate-900/25";
    case "active":
      return "bg-sky-700 ring-1 ring-sky-900/20";
    case "killed_recent":
      return "bg-slate-500";
    case "killed_old":
      return "bg-slate-300/85";
    case "brand_bid":
    default:
      return "bg-slate-200/70";
  }
}


export function platformSortIndex(p: string): number {
  const i = (ALL_PLATFORMS as readonly string[]).indexOf(p);
  return i === -1 ? 1000 : i;
}

/** Format tick label from timestamp */
export function formatTickLabel(t: number, viewStart: number, viewEnd: number): string {
  const d = new Date(t);
  const span = viewEnd - viewStart;
  const crossYear =
    new Date(viewStart).getFullYear() !== new Date(viewEnd).getFullYear();
  if (span <= 45 * DAY_MS) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (crossYear) {
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short" });
}

/**
 * Readable timeline ticks — capped by maxTicks (use containerWidth / 80).
 */
export function buildTimelineTicks(
  viewStart: number,
  viewEnd: number,
  maxTicks: number,
  zoom: TimelineZoom,
): TimelineTick[] {
  const span = Math.max(viewEnd - viewStart, 1);
  const totalDays = span / DAY_MS;
  let count = Math.max(2, Math.min(maxTicks, 24));

  if (zoom === "30d" || totalDays <= 45) {
    const step = span / (count - 1);
    const ticks: TimelineTick[] = [];
    for (let i = 0; i < count; i++) {
      const t = Math.min(viewEnd, viewStart + i * step);
      ticks.push({
        t,
        label: formatTickLabel(t, viewStart, viewEnd),
        pct: ((t - viewStart) / span) * 100,
      });
    }
    return ticks;
  }

  if (zoom === "90d" && totalDays <= 120) {
    const stepDays = Math.max(7, Math.ceil(totalDays / count));
    const step = stepDays * DAY_MS;
    const ticks: TimelineTick[] = [];
    for (let t = viewStart; t <= viewEnd && ticks.length < count; t += step) {
      ticks.push({
        t,
        label: formatTickLabel(t, viewStart, viewEnd),
        pct: ((t - viewStart) / span) * 100,
      });
    }
    if (ticks.length && ticks[ticks.length - 1]!.t < viewEnd - DAY_MS) {
      ticks.push({
        t: viewEnd,
        label: formatTickLabel(viewEnd, viewStart, viewEnd),
        pct: 100,
      });
    }
    return dedupeTicks(ticks, span, viewStart);
  }

  const monthStarts: number[] = [];
  let cur = new Date(viewStart);
  cur = new Date(cur.getFullYear(), cur.getMonth(), 1);
  let t = cur.getTime();
  if (t < viewStart) {
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    t = cur.getTime();
  }
  while (t <= viewEnd) {
    if (t >= viewStart) monthStarts.push(t);
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    t = cur.getTime();
  }
  if (monthStarts.length === 0) {
    monthStarts.push(viewStart);
  }

  if (monthStarts.length <= count) {
    return monthStarts.map((tick) => ({
      t: tick,
      label: formatTickLabel(tick, viewStart, viewEnd),
      pct: ((tick - viewStart) / span) * 100,
    }));
  }

  const stride = Math.ceil(monthStarts.length / count);
  const sampled: TimelineTick[] = [];
  for (let i = 0; i < monthStarts.length; i += stride) {
    const tick = monthStarts[i]!;
    sampled.push({
      t: tick,
      label: formatTickLabel(tick, viewStart, viewEnd),
      pct: ((tick - viewStart) / span) * 100,
    });
  }
  return dedupeTicks(sampled, span, viewStart);
}

function dedupeTicks(ticks: TimelineTick[], span: number, viewStart: number): TimelineTick[] {
  const seen = new Set<string>();
  const out: TimelineTick[] = [];
  for (const x of ticks) {
    const k = x.label + Math.round(x.pct);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ ...x, pct: Math.min(100, Math.max(0, ((x.t - viewStart) / span) * 100)) });
  }
  return out;
}

/** Monday 00:00 local for the ISO week containing `ms`. */
export function startOfIsoWeekMonday(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.getTime();
}

export type WeekBucket = { weekStart: number; key: string; launches: number; retirements: number };

export function aggregateWeekActivity(ads: TimelineAd[]): WeekBucket[] {
  const launchMap = new Map<string, { weekStart: number; launches: number }>();
  const retireMap = new Map<string, { weekStart: number; retirements: number }>();

  for (const ad of ads) {
    const ws = startOfIsoWeekMonday(new Date(ad.first_seen_at).getTime());
    const lk = String(ws);
    const curL = launchMap.get(lk) ?? { weekStart: ws, launches: 0 };
    curL.launches += 1;
    launchMap.set(lk, curL);

    if (ad.is_killed) {
      const wr = startOfIsoWeekMonday(new Date(ad.last_seen_at).getTime());
      const rk = String(wr);
      const curR = retireMap.get(rk) ?? { weekStart: wr, retirements: 0 };
      curR.retirements += 1;
      retireMap.set(rk, curR);
    }
  }

  const keys = new Set([...launchMap.keys(), ...retireMap.keys()]);
  const rows: WeekBucket[] = [];
  for (const key of keys) {
    const l = launchMap.get(key);
    const r = retireMap.get(key);
    rows.push({
      key,
      weekStart: l?.weekStart ?? r?.weekStart ?? 0,
      launches: l?.launches ?? 0,
      retirements: r?.retirements ?? 0,
    });
  }
  rows.sort((a, b) => a.weekStart - b.weekStart);
  return rows;
}

/** Sum of visible launch counts (for chart scaling). */
export function maxWeekMetric(buckets: WeekBucket[]): number {
  let m = 1;
  for (const b of buckets) {
    m = Math.max(m, b.launches, b.retirements);
  }
  return m;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function sortTimelineAds(ads: TimelineAd[], sort: TimelineSort): TimelineAd[] {
  const out = [...ads];
  switch (sort) {
    case "longest":
      return out.sort(
        (a, b) =>
          computeLifespanDays(b.first_seen_at, b.last_seen_at) -
          computeLifespanDays(a.first_seen_at, a.last_seen_at),
      );
    case "recently_killed":
      return out
        .filter((a) => a.is_killed)
        .sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime());
    case "platform":
      return out.sort(
        (a, b) =>
          platformSortIndex(a.platform) - platformSortIndex(b.platform) ||
          new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime(),
      );
    case "newest":
    default:
      return out.sort((a, b) => new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime());
  }
}

export function adMatchesWeekFilter(ad: TimelineAd, weekStart: number): boolean {
  const wk = (ms: number) => startOfIsoWeekMonday(ms);
  return (
    wk(new Date(ad.first_seen_at).getTime()) === weekStart ||
    (ad.is_killed && wk(new Date(ad.last_seen_at).getTime()) === weekStart)
  );
}

export function headlineForAd(ad: TimelineAd): string {
  const t = (ad.ad_text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return ad.ai_extracted_angle?.slice(0, 80) || "Untitled ad";
  const line = t.split(/\n/)[0] ?? t;
  return line.length > 90 ? line.slice(0, 87) + "…" : line;
}
