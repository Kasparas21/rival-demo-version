import type { AlertSeverity, AlertType } from "@/lib/alerts/alert-types";
import { ALL_ALERT_TYPES } from "@/lib/alerts/alert-types";

import { passesWatchMinScore } from "./watch-alert-score";
import type { WatchSensitivity } from "./types";

export type WatchSensitivityRule = {
  /** Alert types that always pass (subject to severity rules below). */
  allowedTypes: Set<AlertType>;
  /** If set, new_angle only passes when severity is in this set. */
  newAngleMinSeverity?: AlertSeverity;
  /** If set, activity_spike only passes when severity is in this set. */
  activitySpikeMinSeverity?: AlertSeverity;
};

/** Single tunable config — adjust thresholds here without touching cron logic. */
export const WATCH_SENSITIVITY_CONFIG: Record<WatchSensitivity, WatchSensitivityRule> = {
  paranoid: {
    allowedTypes: new Set(ALL_ALERT_TYPES),
  },
  balanced: {
    allowedTypes: new Set<AlertType>([
      "new_platform",
      "platform_exit",
      "activity_spike",
      "proven_winner",
      "creative_push",
      "competitor_email",
    ]),
    newAngleMinSeverity: "high",
  },
  big_moves: {
    allowedTypes: new Set<AlertType>(["new_platform", "platform_exit", "activity_spike"]),
    activitySpikeMinSeverity: "high",
  },
};

export function passesWatchSensitivity(
  alertType: string,
  severity: string,
  sensitivity: WatchSensitivity,
): boolean {
  const rule = WATCH_SENSITIVITY_CONFIG[sensitivity];
  if (!rule.allowedTypes.has(alertType as AlertType)) {
    if (alertType === "new_angle" && rule.newAngleMinSeverity) {
      return severity === rule.newAngleMinSeverity;
    }
    return false;
  }
  if (alertType === "new_angle" && rule.newAngleMinSeverity) {
    return severity === rule.newAngleMinSeverity;
  }
  if (alertType === "activity_spike" && rule.activitySpikeMinSeverity) {
    return severity === rule.activitySpikeMinSeverity;
  }
  return true;
}

export function passesWatchFilter(
  alertType: string,
  severity: string,
  settings: { watch_min_score: number | null; watch_sensitivity: WatchSensitivity },
): boolean {
  if (settings.watch_min_score != null) {
    return passesWatchMinScore(alertType, severity, settings.watch_min_score);
  }
  return passesWatchSensitivity(alertType, severity, settings.watch_sensitivity);
}
