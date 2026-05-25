import { describe, expect, it } from "vitest";
import { competitorSidebarShowsLoadingSkeleton } from "@/lib/sidebar-competitors";

describe("competitorSidebarShowsLoadingSkeleton", () => {
  it("shows skeleton for any pending row, even when a domain is already known", () => {
    expect(
      competitorSidebarShowsLoadingSkeleton({
        slug: "ikea.com",
        name: "Ikea",
        pending: true,
        brand: { domain: "ikea.com", name: "Ikea" },
      }),
    ).toBe(true);
  });

  it("does not show skeleton once pending is cleared", () => {
    expect(
      competitorSidebarShowsLoadingSkeleton({
        slug: "ikea.com",
        name: "Ikea",
        pending: false,
      }),
    ).toBe(false);
  });
});
