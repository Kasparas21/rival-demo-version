import { describe, expect, it } from "vitest";

import { distributeMasonryColumns } from "@/components/discovery/use-masonry-column-count";

describe("distributeMasonryColumns", () => {
  it("keeps early items in the same column when more items load", () => {
    const firstPage = distributeMasonryColumns(["a", "b", "c", "d"], 2);
    const withMore = distributeMasonryColumns(["a", "b", "c", "d", "e", "f"], 2);

    expect(firstPage[0]).toEqual(["a", "c"]);
    expect(firstPage[1]).toEqual(["b", "d"]);
    expect(withMore[0]).toEqual(["a", "c", "e"]);
    expect(withMore[1]).toEqual(["b", "d", "f"]);
  });
});
