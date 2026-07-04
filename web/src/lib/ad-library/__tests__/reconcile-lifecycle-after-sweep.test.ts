import { describe, expect, it } from "vitest";

import { applyMetaSweepToMergedCards } from "@/lib/ad-library/reconcile-lifecycle-after-sweep";
import type { MetaAdCard } from "@/lib/ad-library/normalize";

const NOW = Date.parse("2026-07-03T12:00:00.000Z");

function card(id: string, overrides: Partial<MetaAdCard> = {}): MetaAdCard {
  return {
    id,
    adArchiveId: id,
    pageName: "Brand",
    desc: "",
    headline: "",
    linkDescription: "",
    cta: "Shop Now",
    img: "",
    isVideo: false,
    subtext: "",
    adLibraryUrl: `https://www.facebook.com/ads/library/?id=${id}`,
    isActive: true,
    ...overrides,
  } as MetaAdCard;
}

describe("applyMetaSweepToMergedCards", () => {
  it("flips merged cards absent from an exhaustive ACTIVE sweep to inactive", () => {
    const incoming = [card("111"), card("222")];
    const merged = [card("111"), card("222"), card("333"), card("444", { isActive: false, endedAt: 123 })];

    const result = applyMetaSweepToMergedCards(merged, incoming, 1000, NOW);

    const byId = new Map(result.map((c) => [c.id, c]));
    expect(byId.get("111")?.isActive).toBe(true);
    expect(byId.get("222")?.isActive).toBe(true);
    expect(byId.get("333")?.isActive).toBe(false);
    expect(byId.get("333")?.endedAt).toBe(Math.floor(NOW / 1000));
    /** Already-ended cards keep their original end date. */
    expect(byId.get("444")?.endedAt).toBe(123);
  });

  it("does not flip anything when the sweep hit its cap (absence unproven)", () => {
    const incoming = Array.from({ length: 300 }, (_, i) => card(String(i)));
    const merged = [...incoming, card("999")];

    const result = applyMetaSweepToMergedCards(merged, incoming, 300, NOW);
    const extra = result.find((c) => c.id === "999");
    expect(extra?.isActive).toBe(true);
  });

  it("does not flip anything when the sweep returned zero ads (suspicious result)", () => {
    const merged = [card("111")];
    const result = applyMetaSweepToMergedCards(merged, [], 1000, NOW);
    expect(result[0]?.isActive).toBe(true);
  });

  it("does not flip when no cap was provided (non-sweep scrape)", () => {
    const merged = [card("111"), card("222")];
    const result = applyMetaSweepToMergedCards(merged, [card("111")], null, NOW);
    expect(result.find((c) => c.id === "222")?.isActive).toBe(true);
  });
});
