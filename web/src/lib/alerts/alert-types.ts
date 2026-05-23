import { platformLabel } from "@/components/competitor/tests-timeline/timeline-helpers";

export type AlertType =
  | "new_angle"
  | "activity_spike"
  | "activity_drop"
  | "new_platform"
  | "platform_exit"
  | "proven_winner"
  | "creative_push";

export type AlertSeverity = "info" | "notable" | "high";

export const ALL_ALERT_TYPES: AlertType[] = [
  "new_angle",
  "activity_spike",
  "activity_drop",
  "new_platform",
  "platform_exit",
  "proven_winner",
  "creative_push",
];

export type AlertThresholds = {
  activityScoreDelta: number;
  lifespanDays: number;
  creativePushCount: number;
};

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  activityScoreDelta: 20,
  lifespanDays: 30,
  creativePushCount: 8,
};

export const DEFAULT_SEVERITY: Record<AlertType, AlertSeverity> = {
  new_angle: "notable",
  activity_spike: "high",
  activity_drop: "notable",
  new_platform: "high",
  platform_exit: "notable",
  proven_winner: "notable",
  creative_push: "high",
};

/** Types enabled by default for all competitors (feed only; email off). */
export const STARTER_DEFAULT_ENABLED_TYPES: AlertType[] = [
  "new_angle",
  "activity_spike",
  "new_platform",
];

export type AlertTypeConfig = {
  label: string;
  description: string;
  hasThreshold: boolean;
  thresholdKey?: keyof AlertThresholds;
  thresholdLabel?: string;
  thresholdMin?: number;
  thresholdMax?: number;
};

export const ALERT_TYPE_CONFIG: Record<AlertType, AlertTypeConfig> = {
  new_angle: {
    label: "New angle",
    description: "Competitor ran a messaging angle not seen in prior scrapes.",
    hasThreshold: false,
  },
  activity_spike: {
    label: "Activity spike",
    description: "Activity Score rose sharply since the last scrape.",
    hasThreshold: true,
    thresholdKey: "activityScoreDelta",
    thresholdLabel: "Score delta",
    thresholdMin: 5,
    thresholdMax: 50,
  },
  activity_drop: {
    label: "Activity drop",
    description: "Activity Score fell sharply since the last scrape.",
    hasThreshold: true,
    thresholdKey: "activityScoreDelta",
    thresholdLabel: "Score delta",
    thresholdMin: 5,
    thresholdMax: 50,
  },
  new_platform: {
    label: "New platform",
    description: "Competitor now runs active ads on a platform they had none on before.",
    hasThreshold: false,
  },
  platform_exit: {
    label: "Platform exit",
    description: "A platform that had active ads now shows none.",
    hasThreshold: false,
  },
  proven_winner: {
    label: "Proven winner",
    description: "An ad has stayed active past your lifespan threshold.",
    hasThreshold: true,
    thresholdKey: "lifespanDays",
    thresholdLabel: "Lifespan (days)",
    thresholdMin: 7,
    thresholdMax: 90,
  },
  creative_push: {
    label: "Creative push",
    description: "Many new ads detected in a single scrape.",
    hasThreshold: true,
    thresholdKey: "creativePushCount",
    thresholdLabel: "New ads in scrape",
    thresholdMin: 3,
    thresholdMax: 50,
  },
};

export function parseThresholds(raw: unknown): AlertThresholds {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_THRESHOLDS };
  }
  const o = raw as Record<string, unknown>;
  return {
    activityScoreDelta:
      typeof o.activityScoreDelta === "number" && Number.isFinite(o.activityScoreDelta)
        ? o.activityScoreDelta
        : DEFAULT_THRESHOLDS.activityScoreDelta,
    lifespanDays:
      typeof o.lifespanDays === "number" && Number.isFinite(o.lifespanDays)
        ? o.lifespanDays
        : DEFAULT_THRESHOLDS.lifespanDays,
    creativePushCount:
      typeof o.creativePushCount === "number" && Number.isFinite(o.creativePushCount)
        ? o.creativePushCount
        : DEFAULT_THRESHOLDS.creativePushCount,
  };
}

export function buildDedupeKey(
  alertType: AlertType,
  competitorId: string,
  parts: string[]
): string {
  return [alertType, competitorId, ...parts].join(":");
}

export function buildNewAngleDedupeKey(competitorId: string, angle: string): string {
  return buildDedupeKey("new_angle", competitorId, [angle]);
}

export function buildNewPlatformDedupeKey(competitorId: string, platform: string): string {
  return buildDedupeKey("new_platform", competitorId, [platform]);
}

export function buildPlatformExitDedupeKey(competitorId: string, platform: string): string {
  return buildDedupeKey("platform_exit", competitorId, [platform]);
}

export function buildActivitySpikeDedupeKey(competitorId: string, batchId: string): string {
  return buildDedupeKey("activity_spike", competitorId, [batchId]);
}

export function buildActivityDropDedupeKey(competitorId: string, batchId: string): string {
  return buildDedupeKey("activity_drop", competitorId, [batchId]);
}

export function buildProvenWinnerDedupeKey(competitorId: string, scrapedAdId: string): string {
  return buildDedupeKey("proven_winner", competitorId, [scrapedAdId]);
}

export function buildCreativePushDedupeKey(competitorId: string, batchId: string): string {
  return buildDedupeKey("creative_push", competitorId, [batchId]);
}

export type AlertCopyParams = {
  competitorName?: string;
  platform?: string | null;
  angle?: string | null;
  activeAds?: number;
  priorActiveAds?: number;
  scoreBefore?: number;
  scoreAfter?: number;
  scoreDelta?: number;
  newAdCount?: number;
  lifespanDays?: number;
  adPreview?: string | null;
};

export function buildAlertTitle(alertType: AlertType, p: AlertCopyParams): string {
  const name = p.competitorName?.trim() || "Competitor";
  switch (alertType) {
    case "new_platform":
      return `${name} entered ${platformLabel(p.platform ?? "")}`;
    case "platform_exit":
      return `${name} left ${platformLabel(p.platform ?? "")}`;
    case "new_angle":
      return `${name} testing new angle`;
    case "activity_spike":
      return `${name} activity spiked +${p.scoreDelta ?? 0} pts`;
    case "activity_drop":
      return `${name} activity dropped ${p.scoreDelta ?? 0} pts`;
    case "creative_push":
      return `${name} launched ${p.newAdCount ?? 0} new ads`;
    case "proven_winner":
      return `${name} ad running ${p.lifespanDays ?? 0}+ days`;
    default:
      return `${name} activity update`;
  }
}

export function buildAlertBody(alertType: AlertType, p: AlertCopyParams): string {
  const name = p.competitorName?.trim() || "This competitor";
  switch (alertType) {
    case "new_platform": {
      const plat = platformLabel(p.platform ?? "");
      const count = p.activeAds ?? 0;
      return `${name} now runs ${count} active ${plat} ad${count === 1 ? "" : "s"}. Last scrape they had none on ${plat}.`;
    }
    case "platform_exit": {
      const plat = platformLabel(p.platform ?? "");
      const prior = p.priorActiveAds ?? 0;
      return `${name} no longer shows active ads on ${plat}. They previously had ${prior} active ad${prior === 1 ? "" : "s"} there.`;
    }
    case "new_angle": {
      const ang = p.angle?.trim() || "a new angle";
      return `${name} is now running ads on “${ang}”. This angle was not present in the prior scrape.`;
    }
    case "activity_spike":
      return `Activity Score rose from ${p.scoreBefore ?? "—"} to ${p.scoreAfter ?? "—"} (+${p.scoreDelta ?? 0} pts) since the last scrape.`;
    case "activity_drop":
      return `Activity Score fell from ${p.scoreBefore ?? "—"} to ${p.scoreAfter ?? "—"} (${p.scoreDelta ?? 0} pts) since the last scrape.`;
    case "creative_push": {
      const n = p.newAdCount ?? 0;
      return `${name} added ${n} new ad${n === 1 ? "" : "s"} in the latest scrape — a notable creative push.`;
    }
    case "proven_winner": {
      const days = p.lifespanDays ?? 0;
      const preview = p.adPreview?.trim();
      const snippet = preview ? ` “${preview.slice(0, 80)}${preview.length > 80 ? "…" : ""}”` : "";
      return `An ad${snippet} has been active for ${days} days and is still running on ${platformLabel(p.platform ?? "")}.`;
    }
    default:
      return `${name} had a notable change on the latest scrape.`;
  }
}

export function isAlertType(value: string): value is AlertType {
  return (ALL_ALERT_TYPES as string[]).includes(value);
}
