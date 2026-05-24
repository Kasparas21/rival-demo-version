import type { AlertType } from "@/lib/alerts/alert-types";
import { platformLabel } from "@/lib/platforms/platform-label";

type AlertRow = {
  alert_type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
};

/** One scannable bullet for the weekly digest (specific, with numbers when available). */
export function formatDigestChangeLine(alert: AlertRow): string {
  const meta = alert.metadata ?? {};
  const type = alert.alert_type as AlertType;

  switch (type) {
    case "new_platform": {
      const plat = platformLabel(String(meta.platform ?? ""));
      const count = typeof meta.activeAds === "number" ? meta.activeAds : null;
      if (count != null) return `Entered ${plat} with ${count} active ad${count === 1 ? "" : "s"}`;
      return alert.title.trim() || `Entered ${plat}`;
    }
    case "platform_exit": {
      const plat = platformLabel(String(meta.platform ?? ""));
      const prior = typeof meta.priorActiveAds === "number" ? meta.priorActiveAds : null;
      if (prior != null) return `Left ${plat} (previously ${prior} active ad${prior === 1 ? "" : "s"})`;
      return alert.title.trim() || `Left ${plat}`;
    }
    case "new_angle": {
      const angle = typeof meta.angle === "string" ? meta.angle.trim() : "";
      if (angle) return `New angle: “${truncate(angle, 72)}”`;
      return alert.title.trim() || "New messaging angle detected";
    }
    case "activity_spike": {
      const before = meta.scoreBefore;
      const after = meta.scoreAfter;
      const delta = meta.scoreDelta;
      if (typeof before === "number" && typeof after === "number") {
        return `Activity score ${before} → ${after}${typeof delta === "number" ? ` (+${delta})` : ""}`;
      }
      return alert.title.trim() || "Activity score spiked";
    }
    case "activity_drop": {
      const before = meta.scoreBefore;
      const after = meta.scoreAfter;
      const delta = meta.scoreDelta;
      if (typeof before === "number" && typeof after === "number") {
        return `Activity score ${before} → ${after}${typeof delta === "number" ? ` (${delta})` : ""}`;
      }
      return alert.title.trim() || "Activity score dropped";
    }
    case "creative_push": {
      const n = typeof meta.newAdCount === "number" ? meta.newAdCount : null;
      if (n != null) return `Creative push: ${n} new ad${n === 1 ? "" : "s"} in latest scrape`;
      return alert.title.trim() || "Notable creative push";
    }
    case "proven_winner": {
      const days = typeof meta.lifespanDays === "number" ? meta.lifespanDays : null;
      const plat = typeof meta.platform === "string" ? platformLabel(meta.platform) : null;
      if (days != null && plat) return `Proven winner: ad running ${days}+ days on ${plat}`;
      if (days != null) return `Proven winner: ad running ${days}+ days`;
      return alert.title.trim() || "Long-running ad crossed lifespan threshold";
    }
    default:
      break;
  }

  const body = alert.body?.trim();
  if (body) return truncate(body, 140);
  return alert.title.trim() || "Notable change detected";
}

function truncate(value: string, max: number): string {
  const t = value.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

export function dedupeChangeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = line.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(line.trim());
  }
  return out;
}
