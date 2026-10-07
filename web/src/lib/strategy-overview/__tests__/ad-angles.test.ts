import { describe, expect, it } from "vitest";

import { angleLabelOf, angleSlugOf, normalizeAngleSlug } from "@/lib/strategy-overview/ad-angles";

describe("angleSlugOf", () => {
  it("reads the category from a stored label", () => {
    expect(angleSlugOf("price · Hook: Implantai nuo 999€ · Body: Price-led offer")).toBe("price");
    expect(angleSlugOf("social_proof")).toBe("social_proof");
  });

  it("groups old free-text labels into the list or other", () => {
    expect(angleSlugOf("Brand awareness · Hook: Allbirds Inc · Body: Brand presence")).toBe("brand");
    expect(angleSlugOf("brand_awareness · Hook: Rothy's Inc.")).toBe("brand");
    expect(angleSlugOf("q&a education · Hook: …")).toBe("education");
    expect(angleSlugOf("visapusiška pacientų gerovė · Hook: …")).toBe("other");
  });

  it("treats missing labels as unlabelled", () => {
    expect(angleSlugOf(null)).toBeNull();
    expect(angleSlugOf("  ")).toBeNull();
    expect(angleSlugOf("Unclassified")).toBeNull();
    expect(normalizeAngleSlug("")).toBeNull();
  });

  it("has display names", () => {
    expect(angleLabelOf("social_proof · Hook: x")).toBe("Social proof");
    expect(angleLabelOf("brand")).toBe("Brand awareness");
  });
});
