import type { ComparisonMoveRow } from "@/lib/comparison/comparison-move-types";

const DEMO_NOW = new Date("2026-07-15T12:00:00.000Z");

function isoDaysAgo(days: number, hour = 10): string {
  const d = new Date(DEMO_NOW);
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const DEMO_ACTIVITY_SNAPSHOT_COUNT = 26;

/** ~1h before demo “now” — drives “Last analyzed: 1h ago” + cooldown banner. */
export const DEMO_ACTIVITY_LAST_ANALYZED_ISO = isoDaysAgo(0, 11);

export function buildDemoActivityFeedMoves(): ComparisonMoveRow[] {
  return [
    {
      id: "demo-move-snapchat",
      event_type: "new_platform",
      significance: "medium",
      detected_at: isoDaysAgo(19, 14),
      platform: "snapchat",
      before_state: { platforms: ["meta", "google", "tiktok", "pinterest"] },
      after_state: { platform: "Snapchat" },
      narrative:
        "Snapchat appeared in the modeled platform mix with a small but growing share of active creatives.",
    },
    {
      id: "demo-move-budget-meta",
      event_type: "budget_shift",
      significance: "high",
      detected_at: isoDaysAgo(38, 9),
      platform: "meta",
      before_state: { pct: 41 },
      after_state: { pct: 48 },
      narrative: "Modeled Meta spend share increased 7 points vs the prior strategy snapshot.",
    },
    {
      id: "demo-move-angle-recovery",
      event_type: "new_angle",
      significance: "medium",
      detected_at: isoDaysAgo(62, 16),
      platform: "meta",
      before_state: {},
      after_state: {
        angle: "Recovery & rest day",
        evidenceHook: "Train hard — recover smarter with our rest-day essentials",
      },
      narrative: "New creative angle cluster around recovery gear and post-run routines.",
    },
  ];
}
