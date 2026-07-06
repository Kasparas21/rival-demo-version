import { describe, expect, it } from "vitest";

import { buildMcpPagination, paginateInMemory, parseMcpPage } from "@/lib/mcp/pagination";

describe("parseMcpPage", () => {
  it("clamps limit to max", () => {
    expect(parseMcpPage({ limit: 999 }, { maxLimit: 200 }).limit).toBe(200);
  });

  it("defaults offset to 0", () => {
    expect(parseMcpPage({}).offset).toBe(0);
  });
});

describe("paginateInMemory", () => {
  it("returns next_offset when more pages exist", () => {
    const items = [1, 2, 3, 4, 5];
    const { items: page, pagination } = paginateInMemory(items, 2, 0);
    expect(page).toEqual([1, 2]);
    expect(pagination.has_more).toBe(true);
    expect(pagination.next_offset).toBe(2);
    expect(pagination.total).toBe(5);
  });

  it("marks last page", () => {
    const { pagination } = paginateInMemory([1, 2, 3], 2, 2);
    expect(pagination.has_more).toBe(false);
    expect(pagination.next_offset).toBeNull();
  });
});

describe("buildMcpPagination", () => {
  it("computes has_more from total", () => {
    const p = buildMcpPagination(100, 50, 50);
    expect(p.has_more).toBe(false);
    expect(p.next_offset).toBeNull();
  });
});
