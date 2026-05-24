import type { AlertType } from "@/lib/alerts/alert-types";
import { platformLabel } from "@/lib/platforms/platform-label";

import { formatDigestChangeLine } from "@/lib/digest/format-digest-change";

export type DigestHeroStat = {
  value: string;
  label: string;
  /** Change line to omit from bullets (matched loosely). */
  sourceLine?: string;
};

type AlertRow = {
  alert_type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
};

type DigestCompetitorSlice = {
  name: string;
  url: string;
  changes: string[];
  heroStat: DigestHeroStat;
  alerts: AlertRow[];
};

const HERO_PRIORITY: AlertType[] = [
  "activity_spike",
  "creative_push",
  "proven_winner",
  "new_platform",
  "activity_drop",
  "new_angle",
  "platform_exit",
];

function heroFromAlert(alert: AlertRow): DigestHeroStat | null {
  const meta = alert.metadata ?? {};
  const type = alert.alert_type as AlertType;
  const sourceLine = formatDigestChangeLine(alert);

  switch (type) {
    case "activity_spike": {
      const delta = typeof meta.scoreDelta === "number" ? meta.scoreDelta : null;
      const before = typeof meta.scoreBefore === "number" ? meta.scoreBefore : null;
      const after = typeof meta.scoreAfter === "number" ? meta.scoreAfter : null;
      if (delta == null) return null;
      const label =
        before != null && after != null
          ? `Activity score jump (${before} → ${after})`
          : "Activity score jump this week";
      return { value: `+${delta}`, label, sourceLine };
    }
    case "activity_drop": {
      const delta = typeof meta.scoreDelta === "number" ? meta.scoreDelta : null;
      const before = typeof meta.scoreBefore === "number" ? meta.scoreBefore : null;
      const after = typeof meta.scoreAfter === "number" ? meta.scoreAfter : null;
      if (delta == null) return null;
      const label =
        before != null && after != null
          ? `Activity score drop (${before} → ${after})`
          : "Activity score drop this week";
      return { value: String(delta), label, sourceLine };
    }
    case "creative_push": {
      const n = typeof meta.newAdCount === "number" ? meta.newAdCount : null;
      if (n == null) return null;
      return { value: String(n), label: "New ads this week", sourceLine };
    }
    case "proven_winner": {
      const days = typeof meta.lifespanDays === "number" ? meta.lifespanDays : null;
      if (days == null) return null;
      return { value: String(days), label: "Days a winning ad has run", sourceLine };
    }
    case "new_platform": {
      const n = typeof meta.activeAds === "number" ? meta.activeAds : null;
      const plat = platformLabel(String(meta.platform ?? ""));
      if (n == null) return null;
      return { value: String(n), label: `Active ads on new platform (${plat})`, sourceLine };
    }
    case "new_angle": {
      const angle = typeof meta.angle === "string" ? meta.angle.trim() : "";
      if (!angle) return null;
      return {
        value: "New",
        label: `Messaging angle: “${truncate(angle, 48)}”`,
        sourceLine,
      };
    }
    case "platform_exit": {
      const prior = typeof meta.priorActiveAds === "number" ? meta.priorActiveAds : null;
      const plat = platformLabel(String(meta.platform ?? ""));
      if (prior == null) return null;
      return { value: String(prior), label: `Ads removed from ${plat}`, sourceLine };
    }
    default:
      return null;
  }
}

/** Pick the most striking hero stat for a competitor from its alerts. */
export function pickHeroStatFromAlerts(alerts: AlertRow[]): DigestHeroStat {
  const byType = new Map<string, AlertRow>();
  for (const a of alerts) byType.set(a.alert_type, a);

  for (const type of HERO_PRIORITY) {
    const alert = byType.get(type);
    if (!alert) continue;
    const hero = heroFromAlert(alert);
    if (hero) return hero;
  }

  const fallbackLine = alerts[0] ? formatDigestChangeLine(alerts[0]) : "Notable change this week";
  return { value: "—", label: fallbackLine, sourceLine: fallbackLine };
}

export function changesWithoutHeroStat(allChanges: string[], hero: DigestHeroStat): string[] {
  if (!hero.sourceLine) return allChanges;
  const key = hero.sourceLine.trim().toLowerCase();
  return allChanges.filter((c) => c.trim().toLowerCase() !== key);
}

function truncate(value: string, max: number): string {
  const t = value.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function describeAlertBrief(alert: AlertRow, name: string): string | null {
  const meta = alert.metadata ?? {};
  const type = alert.alert_type as AlertType;
  switch (type) {
    case "new_platform":
      return `${name} entered ${platformLabel(String(meta.platform ?? "a new platform"))}`;
    case "activity_spike":
      return `${name} activity spiked${typeof meta.scoreDelta === "number" ? ` (+${meta.scoreDelta})` : ""}`;
    case "creative_push":
      return `${name} launched a creative push`;
    case "proven_winner":
      return `${name} has a long-running winner`;
    case "new_angle":
      return `${name} is testing new messaging`;
    case "platform_exit":
      return `${name} pulled back from a platform`;
    case "activity_drop":
      return `${name} activity cooled off`;
    default:
      return null;
  }
}

/** 1–2 sentence plain-English summary for the top of the email. */
export function buildSummaryTakeaway(
  competitors: Array<{ name: string; alerts: AlertRow[] }>
): string {
  if (competitors.length === 0) return "";

  const ranked = [...competitors].sort((a, b) => scoreCompetitor(b) - scoreCompetitor(a));
  const lead = ranked[0]!;
  const leadHook = describeAlertBrief(lead.alerts[0]!, lead.name);

  if (competitors.length === 1 && leadHook) {
    return `${leadHook} — worth a closer look this week.`;
  }

  const leadParts: string[] = [];
  for (const alert of lead.alerts.slice(0, 2)) {
    const bit = describeAlertBrief(alert, lead.name);
    if (bit) leadParts.push(bit.replace(`${lead.name} `, "").replace(/^./, (c) => c.toLowerCase()));
  }

  const leadSentence =
    leadParts.length > 0
      ? `${lead.name} is moving — ${leadParts.join(" and ")}.`
      : `${lead.name} had the biggest shift this week.`;

  if (competitors.length === 2) {
    const second = ranked[1]!;
    return `${leadSentence} ${second.name} also made notable moves. Worth a look this week.`;
  }

  return `${leadSentence} ${competitors.length - 1} other competitor${competitors.length - 1 === 1 ? "" : "s"} shifted strategy too — worth a look this week.`;
}

function scoreCompetitor(c: { alerts: AlertRow[] }): number {
  let score = 0;
  for (const a of c.alerts) {
    const t = a.alert_type as AlertType;
    if (t === "activity_spike" || t === "new_platform" || t === "creative_push") score += 3;
    else if (t === "proven_winner" || t === "new_angle") score += 2;
    else score += 1;
    if (a.metadata && typeof a.metadata === "object" && (a.metadata as { severity?: string }).severity === "high") {
      score += 1;
    }
  }
  return score;
}

/** 2–3 action-oriented bullets for “What to do this week”. */
export function buildActionItems(slices: DigestCompetitorSlice[]): string[] {
  const items: string[] = [];

  for (const c of slices) {
    for (const alert of c.alerts) {
      const item = actionItemForAlert(c.name, c.url, alert);
      if (item && !items.includes(item)) items.push(item);
      if (items.length >= 3) return items;
    }
  }

  return items.slice(0, 3);
}

function actionItemForAlert(name: string, _url: string, alert: AlertRow): string | null {
  const meta = alert.metadata ?? {};
  const type = alert.alert_type as AlertType;
  switch (type) {
    case "new_platform": {
      const plat = platformLabel(String(meta.platform ?? "a new platform"));
      return `Check ${name}'s new ${plat} ads — they just entered the platform.`;
    }
    case "creative_push":
      return `Review ${name}'s latest creative push — several new ads landed this week.`;
    case "proven_winner": {
      const days = typeof meta.lifespanDays === "number" ? meta.lifespanDays : null;
      return days != null
        ? `${name} has an ad running ${days}+ days — study that proven winner in Copy Vault.`
        : `Open ${name}'s proven winner in Copy Vault and note what's still running.`;
    }
    case "new_angle": {
      const angle = typeof meta.angle === "string" ? meta.angle.trim() : "";
      return angle
        ? `Compare ${name}'s new “${truncate(angle, 40)}” angle against your current messaging.`
        : `Review ${name}'s new messaging angle in Copy Vault.`;
    }
    case "activity_spike":
      return `Dig into ${name}'s activity spike — something scaled fast this week.`;
    case "activity_drop":
      return `See what ${name} pulled back on — activity dropped sharply.`;
    case "platform_exit": {
      const plat = platformLabel(String(meta.platform ?? "a platform"));
      return `Note that ${name} exited ${plat} — their mix may be shifting.`;
    }
    default:
      return `Review ${name}'s latest alerts in Rival.`;
  }
}

export function buildCompetitorEmailSlices(
  competitors: Array<{
    name: string;
    url: string;
    changes: string[];
    alerts: AlertRow[];
  }>
): DigestCompetitorSlice[] {
  return competitors.map((c) => {
    const heroStat = pickHeroStatFromAlerts(c.alerts);
    const changes = changesWithoutHeroStat(c.changes, heroStat).slice(0, 3);
    return { ...c, heroStat, changes };
  });
}

const DIGEST_PLATFORM_IDS = ["meta", "google", "tiktok", "linkedin", "pinterest", "snapchat"] as const;

const PLATFORM_SHORT: Record<string, string> = {
  meta: "Meta",
  google: "Google",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
};

export function normalizeDigestPlatformKey(platform: string): string | null {
  const x = platform.trim().toLowerCase();
  if (x === "youtube" || x === "microsoft" || x === "bing") return "google";
  if ((DIGEST_PLATFORM_IDS as readonly string[]).includes(x)) return x;
  return null;
}

export function buildPlatformPresence(activeKeys: Iterable<string>): Array<{ id: string; label: string; active: boolean }> {
  const active = new Set<string>();
  for (const raw of activeKeys) {
    const k = normalizeDigestPlatformKey(raw);
    if (k) active.add(k);
  }
  return DIGEST_PLATFORM_IDS.map((id) => ({
    id,
    label: PLATFORM_SHORT[id] ?? id,
    active: active.has(id),
  }));
}

export function activePlatformsFromAlerts(alerts: AlertRow[]): Set<string> {
  const out = new Set<string>();
  const exited = new Set<string>();

  for (const alert of alerts) {
    const meta = alert.metadata ?? {};
    const type = alert.alert_type as AlertType;
    const rawPl = typeof meta.platform === "string" ? meta.platform : "";
    const pl = normalizeDigestPlatformKey(rawPl);
    if (!pl) continue;

    if (type === "platform_exit") exited.add(pl);
    else if (type === "new_platform" || type === "creative_push" || type === "proven_winner") out.add(pl);
  }

  for (const ex of exited) out.delete(ex);
  return out;
}

export function buildActivityBarFromAlerts(alerts: AlertRow[], fallbackScore = 0): { score: number; label: string } {
  let score = fallbackScore;
  for (const alert of alerts) {
    const meta = alert.metadata ?? {};
    if (typeof meta.scoreAfter === "number" && Number.isFinite(meta.scoreAfter)) {
      score = meta.scoreAfter;
      break;
    }
  }
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return { score: clamped, label: "Activity score" };
}

export type DigestHeadlineStat = { value: string; label: string };

/** Top-row headline stats aggregated across the week's alerts. */
export function buildHeadlineStats(
  competitorCount: number,
  allAlerts: AlertRow[]
): DigestHeadlineStat[] {
  let newAds = 0;
  let newPlatforms = 0;
  let maxJump = 0;

  for (const alert of allAlerts) {
    const meta = alert.metadata ?? {};
    const type = alert.alert_type as AlertType;

    if (type === "creative_push" && typeof meta.newAdCount === "number") {
      newAds += meta.newAdCount;
    }
    if (type === "new_platform") newPlatforms += 1;
    if (type === "activity_spike" && typeof meta.scoreDelta === "number") {
      maxJump = Math.max(maxJump, meta.scoreDelta);
    }
  }

  return [
    { value: String(competitorCount), label: "Competitors active" },
    { value: newAds > 0 ? String(newAds) : "0", label: "New ads this week" },
    {
      value: String(newPlatforms),
      label: newPlatforms === 1 ? "Entered a new platform" : "Entered new platforms",
    },
    {
      value: maxJump > 0 ? `+${maxJump}` : "0",
      label: "Biggest activity jump",
    },
  ];
}

/** Single bold hook line — the most important insight of the week. */
export function buildHookTakeaway(
  competitors: Array<{ name: string; alerts: AlertRow[] }>
): string {
  if (competitors.length === 0) return "";

  const ranked = [...competitors].sort((a, b) => scoreCompetitor(b) - scoreCompetitor(a));
  const lead = ranked[0]!;
  const name = lead.name;

  const hasNewPlatform = lead.alerts.some((a) => a.alert_type === "new_platform");
  const spike = lead.alerts.find((a) => a.alert_type === "activity_spike");
  const spikeMeta = spike?.metadata ?? {};
  const delta = typeof spikeMeta.scoreDelta === "number" ? spikeMeta.scoreDelta : null;
  const before = typeof spikeMeta.scoreBefore === "number" ? spikeMeta.scoreBefore : null;
  const after = typeof spikeMeta.scoreAfter === "number" ? spikeMeta.scoreAfter : null;

  if (hasNewPlatform && delta != null && delta >= 20) {
    return `${name} is scaling aggressively — new platform plus activity jumped +${delta}. This is the one to watch.`;
  }
  if (hasNewPlatform) {
    return `${name} entered a new platform this week — their mix is shifting. Worth a close look.`;
  }
  if (delta != null && before != null && after != null && before > 0 && after >= before * 1.5) {
    return `${name} is scaling aggressively — activity nearly doubled (${before} → ${after}). This is the one to watch.`;
  }
  if (delta != null && delta >= 15) {
    return `${name} activity spiked +${delta} this week — the biggest move in your watchlist.`;
  }

  const push = lead.alerts.find((a) => a.alert_type === "creative_push");
  if (push) {
    const n = (push.metadata as Record<string, unknown> | null)?.newAdCount;
    if (typeof n === "number" && n >= 5) {
      return `${name} launched ${n} new ads — a serious creative push worth studying.`;
    }
  }

  return buildSummaryTakeaway(competitors);
}
