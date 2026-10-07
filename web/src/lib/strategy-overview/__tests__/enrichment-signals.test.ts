import { describe, expect, it } from "vitest";

import { enrichmentSignalsForAd, forcedBofFromSignals } from "@/lib/strategy-overview/adEnrichment";

describe("enrichmentSignalsForAd", () => {
  it("reads Meta's button, headline, link description and landing page (host + path only)", () => {
    expect(
      enrichmentSignalsForAd({
        cta: "Book Now",
        headline: "Free consultation",
        linkDescription: "Vilnius clinic",
        destinationUrl: "https://www.example.lt/pasiulymai/implantai?utm_source=fb",
      }),
    ).toEqual({
      cta: "Book Now",
      headline: "Free consultation",
      link_description: "Vilnius clinic",
      landing_page: "example.lt/pasiulymai/implantai",
    });
  });

  it("returns nothing for missing payloads", () => {
    expect(enrichmentSignalsForAd(null)).toEqual({});
    expect(enrichmentSignalsForAd({ cta: "" }).cta).toBeUndefined();
  });
});

describe("forcedBofFromSignals", () => {
  it("forces BOF for a stated price or a booking button", () => {
    expect(forcedBofFromSignals({ ad_text: "Danties implantacija tik nuo 544 €" })).toBe(true);
    expect(forcedBofFromSignals({ ad_text: "Full jaw for 4 400 € in parts" })).toBe(true);
    expect(forcedBofFromSignals({ ad_text: "Clogs from $98" })).toBe(true);
    expect(forcedBofFromSignals({ ad_text: "Meet our team", cta: "Book now" })).toBe(true);
  });

  it("leaves satisfaction stats and neutral buttons to the model", () => {
    expect(forcedBofFromSignals({ ad_text: "Net 99 % pacientų rinktųsi mus vėl" })).toBe(false);
    expect(forcedBofFromSignals({ ad_text: "Why gums bleed", cta: "Learn More" })).toBe(false);
  });
});
