import { describe, expect, it } from "vitest";

import { pickBrandName } from "@/lib/onboarding/pick-brand-name";

describe("pickBrandName", () => {
  it("ignores slogan titles and uses the brand", () => {
    expect(
      pickBrandName({ domain: "allbirds.com", ogTitle: "The World's Most Comfortable Shoes", title: "Allbirds | The World's Most Comfortable Shoes" }),
    ).toBe("Allbirds");
    expect(pickBrandName({ domain: "allbirds.com", ogTitle: "The World's Most Comfortable Shoes" })).toBe("Allbirds");
  });

  it("keeps the brand's own spelling when it matches the domain", () => {
    expect(pickBrandName({ domain: "rothys.com", title: "Rothy's: Sustainable Shoes & Bags" })).toBe("Rothy's");
    expect(pickBrandName({ domain: "margentura.lt", ogSiteName: "Margentūra" })).toBe("Margentūra");
    expect(pickBrandName({ domain: "www.nike.com", ogTitle: "Nike. Just Do It. Nike.com" })).toBe("Nike");
  });

  it("uses a short site name when no title matches the domain", () => {
    expect(pickBrandName({ domain: "abc-shop.de", ogSiteName: "ABC Schuhe", ogTitle: "Willkommen" })).toBe("ABC Schuhe");
  });

  it("falls back to the domain label", () => {
    expect(pickBrandName({ domain: "my-brand.co.uk", ogTitle: "Home" })).toBe("My Brand");
    expect(pickBrandName({ domain: "allbirds.com" })).toBe("Allbirds");
  });
});
