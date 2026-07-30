import { describe, expect, it, vi } from "vitest";

import { filterWeeklyScrapeRowsWithBrandMapping } from "@/lib/ad-library/weekly-scrape-brand-mapping";

function makeAdmin(mappingIds: string[] | null, errorMessage?: string) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(async () => {
          if (errorMessage) {
            return { data: null, error: { message: errorMessage } };
          }
          return {
            data: (mappingIds ?? []).map((competitor_id) => ({ competitor_id })),
            error: null,
          };
        }),
      })),
    })),
  };
}

describe("filterWeeklyScrapeRowsWithBrandMapping", () => {
  it("keeps workspace brand rows even without brand mappings", async () => {
    const rows = [
      { id: "ws", is_workspace_brand: true },
      { id: "orphan", is_workspace_brand: false },
    ] as const;

    const filtered = await filterWeeklyScrapeRowsWithBrandMapping(
      makeAdmin([]) as never,
      [...rows],
    );

    expect(filtered.map((row) => row.id)).toEqual(["ws"]);
  });

  it("keeps competitors still mapped to a brand workspace", async () => {
    const rows = [
      { id: "mapped", is_workspace_brand: false },
      { id: "orphan", is_workspace_brand: false },
    ] as const;

    const filtered = await filterWeeklyScrapeRowsWithBrandMapping(
      makeAdmin(["mapped"]) as never,
      [...rows],
    );

    expect(filtered.map((row) => row.id)).toEqual(["mapped"]);
  });

  it("passes all rows through when brand_competitors is unavailable", async () => {
    const rows = [
      { id: "a", is_workspace_brand: false },
      { id: "b", is_workspace_brand: false },
    ] as const;

    const filtered = await filterWeeklyScrapeRowsWithBrandMapping(
      makeAdmin(null, "relation brand_competitors does not exist") as never,
      [...rows],
    );

    expect(filtered).toHaveLength(2);
  });
});
