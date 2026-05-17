import { describe, expect, it } from "vitest";

import { collectAdsCacheDomainVariantsForSavedCompetitorRow } from "@/lib/ad-library/competitor-cache-domain";

describe("collectAdsCacheDomainVariantsForSavedCompetitorRow", () => {
  it("includes slug and FQDN variants for the same brand", () => {
    const variants = collectAdsCacheDomainVariantsForSavedCompetitorRow(
      { slug: "apple", brand_domain: "apple.com" },
      "apple.com"
    );
    expect(variants).toContain("apple");
    expect(variants).toContain("apple.com");
  });

  it("includes first-label hint when domain has a dot", () => {
    const variants = collectAdsCacheDomainVariantsForSavedCompetitorRow(
      { slug: "nike", brand_domain: "nike.com" },
      null
    );
    expect(variants).toContain("nike");
    expect(variants).toContain("nike.com");
  });
});
