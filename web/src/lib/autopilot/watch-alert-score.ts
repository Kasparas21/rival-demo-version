import type { AlertSeverity, AlertType } from "@/lib/alerts/alert-types";
import { isAlertType } from "@/lib/alerts/alert-types";

/** Base watch score by alert type + severity (1–10, aligned with agent min_threat_score UX). */
const ALERT_WATCH_SCORE: Partial<Record<AlertType, Partial<Record<AlertSeverity, number>>>> = {
  new_platform: { high: 10, notable: 9, info: 7 },
  platform_exit: { high: 9, notable: 8, info: 6 },
  activity_spike: { high: 8, notable: 6, info: 4 },
  creative_push: { high: 7, notable: 6, info: 4 },
  proven_winner: { high: 7, notable: 6, info: 4 },
  competitor_email: { high: 7, notable: 6, info: 4 },
  new_angle: { high: 7, notable: 5, info: 3 },
  activity_drop: { high: 5, notable: 4, info: 3 },
};

const SEVERITY_ORDER: AlertSeverity[] = ["high", "notable", "info"];

function isAlertSeverity(value: string): value is AlertSeverity {
  return value === "high" || value === "notable" || value === "info";
}

/** Derived score for competitor_alerts rows (comparable to agent threat_score thresholds). */
export function alertWatchScore(alertType: string, severity: string): number {
  const type = isAlertType(alertType) ? alertType : null;
  const sev = isAlertSeverity(severity) ? severity : "notable";

  if (type) {
    const byType = ALERT_WATCH_SCORE[type];
    const exact = byType?.[sev];
    if (typeof exact === "number") return exact;
  }

  const fallback: Record<AlertSeverity, number> = { high: 8, notable: 6, info: 4 };
  return fallback[sev] ?? 5;
}

export function passesWatchMinScore(alertType: string, severity: string, minScore: number): boolean {
  return alertWatchScore(alertType, severity) >= minScore;
}

/** Map UI threshold selection to stored sensitivity (written together with watch_min_score). */
export function watchSensitivityForMinScore(minScore: number): "balanced" | "big_moves" {
  return minScore >= 8 ? "big_moves" : "balanced";
}

/** Normalize legacy DB values for UI radios (6 / 8 / 9). */
export function normalizeWatchMinScoreForUi(raw: number | null | undefined): 6 | 8 | 9 {
  if (raw == null) return 6;
  if (raw >= 9) return 9;
  if (raw >= 8) return 8;
  return 6;
}

export const WATCH_THRESHOLD_OPTIONS = [
  { value: 6 as const, label: "Meaningful moves — score 6+", sensitivity: "balanced" as const },
  { value: 8 as const, label: "Big moves only — score 8+", sensitivity: "big_moves" as const },
  { value: 9 as const, label: "Critical only — score 9+", sensitivity: "big_moves" as const },
];

export { SEVERITY_ORDER };
