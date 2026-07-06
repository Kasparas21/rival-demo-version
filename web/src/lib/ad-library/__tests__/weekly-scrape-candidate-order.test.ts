import { describe, expect, it } from "vitest";

import { competitorIdsWithDuePlatforms } from "@/lib/ad-library/weekly-scrape-candidate-order";

describe("competitorIdsWithDuePlatforms", () => {
  it("marks competitors with overdue platforms as due", async () => {
    const admin = {
      from: () => ({
        select: () => ({
          in: async () => ({
            data: [
              {
                competitor_id: "a",
                next_scrape_at: "2026-07-01T00:00:00.000Z",
              },
              {
                competitor_id: "b",
                next_scrape_at: "2026-07-10T00:00:00.000Z",
              },
            ],
          }),
        }),
      }),
    } as never;

    const due = await competitorIdsWithDuePlatforms(admin, ["a", "b"], Date.parse("2026-07-06T12:00:00.000Z"));
    expect(due.has("a")).toBe(true);
    expect(due.has("b")).toBe(false);
  });

  it("treats missing tracking rows as due", async () => {
    const admin = {
      from: () => ({
        select: () => ({
          in: async () => ({ data: [] }),
        }),
      }),
    } as never;

    const due = await competitorIdsWithDuePlatforms(admin, ["new-competitor"], Date.now());
    expect(due.has("new-competitor")).toBe(true);
  });
});
