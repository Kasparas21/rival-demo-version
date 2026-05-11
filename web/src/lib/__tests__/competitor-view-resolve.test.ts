import { describe, expect, it } from "vitest";

import { resolveCompetitorViewFromSidebar } from "@/lib/competitor-view-resolve";
import type { SidebarCompetitor } from "@/lib/sidebar-competitors";

/** Simulates GET `/api/account/saved-competitors` merged into the sidebar: no local `libraryContext`. */
function accountSyncedRow(partial: Partial<SidebarCompetitor> & Pick<SidebarCompetitor, "slug" | "name">): SidebarCompetitor {
  return {
    slug: partial.slug,
    name: partial.name,
    logoUrl: partial.logoUrl,
    brand: partial.brand,
    pending: partial.pending ?? false,
    lastScrapedAt: partial.lastScrapedAt,
    libraryContext: partial.libraryContext,
  };
}

describe("resolveCompetitorViewFromSidebar", () => {
  it("treats account-synced row with lastScrapedAt as confirmed so Ads Library can load from ads_cache", () => {
    const row = accountSyncedRow({
      slug: "acme.com",
      name: "Acme",
      brand: { name: "Acme", domain: "acme.com" },
      lastScrapedAt: "2026-05-11T12:00:00.000Z",
    });
    const out = resolveCompetitorViewFromSidebar("acme.com", emptyOverrides(), [row]);
    expect(out.isConfirmed).toBe(true);
  });

  it("treats saved non-pending competitor with brand domain as confirmed when lastScrapedAt is absent", () => {
    const row = accountSyncedRow({
      slug: "acme.com",
      name: "Acme",
      brand: { name: "Acme", domain: "acme.com" },
      pending: false,
    });
    const out = resolveCompetitorViewFromSidebar("acme.com", emptyOverrides(), [row]);
    expect(out.isConfirmed).toBe(true);
  });

  it("does not confirm mid-discovery pending rows without lastScrapedAt", () => {
    const row = accountSyncedRow({
      slug: "acme.com",
      name: "Acme",
      brand: { name: "Acme", domain: "acme.com" },
      pending: true,
    });
    const out = resolveCompetitorViewFromSidebar("acme.com", emptyOverrides(), [row]);
    expect(out.isConfirmed).toBe(false);
  });

  it("respects confirmed=0 query override", () => {
    const row = accountSyncedRow({
      slug: "acme.com",
      name: "Acme",
      brand: { name: "Acme", domain: "acme.com" },
      lastScrapedAt: "2026-05-11T12:00:00.000Z",
    });
    const out = resolveCompetitorViewFromSidebar("acme.com", { ...emptyOverrides(), confirmedParam: "0" }, [row]);
    expect(out.isConfirmed).toBe(false);
  });
});

function emptyOverrides(): Parameters<typeof resolveCompetitorViewFromSidebar>[1] {
  return {
    brandParam: null,
    idsParam: null,
    channelsParam: "",
    confirmedParam: null,
  };
}
