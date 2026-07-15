import type { AlertSeverity, AlertType } from "@/lib/alerts/alert-types";
import { isAlertType } from "@/lib/alerts/alert-types";

import type { WatchSensitivity } from "./types";

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

export const WATCH_MIN_SCORE_MIN = 1;
export const WATCH_MIN_SCORE_MAX = 10;
export const WATCH_MIN_SCORE_DEFAULT = 6;

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

/** Map slider value to stored sensitivity (written together with watch_min_score). */
export function watchSensitivityForMinScore(minScore: number): WatchSensitivity {
  if (minScore <= 5) return "paranoid";
  if (minScore <= 7) return "balanced";
  return "big_moves";
}

export function normalizeWatchMinScoreForUi(raw: number | null | undefined): number {
  if (raw == null) return WATCH_MIN_SCORE_DEFAULT;
  return Math.min(WATCH_MIN_SCORE_MAX, Math.max(WATCH_MIN_SCORE_MIN, Math.round(raw)));
}

/** UI slider: 1 = fewest alerts, 10 = most alerts (inverse of stored min score). */
export function minScoreToAlertVolume(minScore: number): number {
  const s = normalizeWatchMinScoreForUi(minScore);
  return WATCH_MIN_SCORE_MAX + WATCH_MIN_SCORE_MIN - s;
}

export function alertVolumeToMinScore(volume: number): number {
  const v = Math.min(WATCH_MIN_SCORE_MAX, Math.max(WATCH_MIN_SCORE_MIN, Math.round(volume)));
  return WATCH_MIN_SCORE_MAX + WATCH_MIN_SCORE_MIN - v;
}

export function watchThresholdLabel(minScore: number): string {
  const s = normalizeWatchMinScoreForUi(minScore);
  if (s <= 2) return "Catch almost everything";
  if (s <= 4) return "Most competitor moves";
  if (s <= 6) return "Meaningful moves";
  if (s <= 8) return "Big moves only";
  return "Critical only";
}

export function watchThresholdHint(minScore: number): string {
  const volume = minScoreToAlertVolume(minScore);
  if (volume <= 2) return "Only the biggest competitor moves will notify you.";
  if (volume <= 4) return "Major shifts and launches — not every small tweak.";
  if (volume <= 6) return "A balanced mix of meaningful competitor activity.";
  if (volume <= 8) return "Most moves from your tracked competitors will alert you.";
  return "Almost every scored alert will reach you — highest volume.";
}

export { SEVERITY_ORDER };
