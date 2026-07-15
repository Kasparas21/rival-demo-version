import { describe, expect, it } from "vitest";

import {
  isDemoMarkedSidebarCompetitor,
  isDemoMarkedSidebarCompetitorSlug,
  shouldHideDemoMarkedSidebarCompetitor,
  shouldShowDemoMarkedCompetitorDot,
} from "../demo-sidebar-competitors";

const calai = {
  slug: "calai.app",
  name: "Calai",
  brand: { name: "Calai", domain: "calai.app" },
};

describe("demo-sidebar-competitors", () => {
  it("matches calai and ikea slugs", () => {
    expect(isDemoMarkedSidebarCompetitorSlug("calai.app")).toBe(true);
    expect(isDemoMarkedSidebarCompetitorSlug("https://www.ikea.com")).toBe(true);
    expect(isDemoMarkedSidebarCompetitorSlug("adidas.com")).toBe(false);
  });

  it("matches competitor rows by name", () => {
    expect(isDemoMarkedSidebarCompetitor(calai)).toBe(true);
    expect(
      isDemoMarkedSidebarCompetitor({
        slug: "ikea.com",
        name: "Ikea",
        brand: { name: "Ikea", domain: "ikea.com" },
      }),
    ).toBe(true);
  });

  it("hides marked competitors when debug off and shows dot when debug on (demo owner only)", () => {
    const prev = process.env.NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION;
    const email = "attributo@yahoo.com";

    process.env.NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION = "false";
    try {
      expect(shouldHideDemoMarkedSidebarCompetitor(email, calai)).toBe(true);
      expect(shouldShowDemoMarkedCompetitorDot(email, calai)).toBe(false);
      expect(shouldHideDemoMarkedSidebarCompetitor("other@example.com", calai)).toBe(false);
    } finally {
      process.env.NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION = prev;
    }

    process.env.NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION = "true";
    try {
      expect(shouldHideDemoMarkedSidebarCompetitor(email, calai)).toBe(false);
      expect(shouldShowDemoMarkedCompetitorDot(email, calai)).toBe(true);
    } finally {
      process.env.NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION = prev;
    }
  });
});
