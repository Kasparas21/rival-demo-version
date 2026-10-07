import { describe, expect, it } from "vitest";

import { listStealableAngleRows } from "@/lib/comparison/angle-compare";
import type { AnglesByPlatformInsight, CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";

const row = (angle: string, totalCount: number, platform: "meta" | "google" = "meta"): AnglesByPlatformInsight => ({
  angle,
  totalCount,
  platforms: [platform],
  platformCounts: { [platform]: totalCount },
  avgLifespanDays: 10,
});
const payload = (rows: AnglesByPlatformInsight[]) =>
  ({ insights: { angles_by_platform: rows } }) as unknown as CompetitorStrategyOverviewPayload;

describe("listStealableAngleRows", () => {
  it("matches by category even when labels embed each brand's name", () => {
    const you = payload([row("price · Hook: Allbirds Inc · Body: Sale", 4)]);
    const them = payload([
      row("price · Hook: Rothy's Inc. · Body: Sale", 9),
      row("Social proof", 6),
    ]);
    expect(listStealableAngleRows(you, them).map((r) => r.angle)).toEqual(["Social proof"]);
  });

  it("merges older per-label rows into one row per category", () => {
    const them = payload([
      row("urgency · Hook: Last pairs · Body: x", 3, "meta"),
      row("urgency · Hook: Ends Sunday · Body: y", 5, "google"),
      row("other · Hook: z", 7),
    ]);
    const rows = listStealableAngleRows(payload([]), them);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      angle: "urgency · Hook: Ends Sunday · Body: y",
      totalCount: 8,
      platforms: ["meta", "google"],
      platformCounts: { meta: 3, google: 5 },
    });
  });
});
