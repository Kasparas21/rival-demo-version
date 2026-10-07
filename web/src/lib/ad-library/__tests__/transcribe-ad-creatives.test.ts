import { describe, expect, it } from "vitest";

import { creativeImageUrl } from "@/lib/ad-library/transcribe-ad-creatives";
import { enrichmentContentHash, enrichmentTextForAd } from "@/lib/strategy-overview/adEnrichment";

const PLACEHOLDER = "UAB PERLADENTA — perladenta.lt\nImage · Shown 2026-03-03 → 2026-07-31\n2026-03-03 – 2026-07-31\nUAB PERLADENTA";

describe("creativeImageUrl", () => {
  it("takes the archived ad image, not the preview script", () => {
    expect(creativeImageUrl({ img: "https://tpc.googlesyndication.com/archive/simgad/123" })).toBe(
      "https://tpc.googlesyndication.com/archive/simgad/123",
    );
    expect(
      creativeImageUrl({ img: "https://displayads-formats.googleusercontent.com/ads/preview/content.js?x=1" }),
    ).toBeNull();
    expect(creativeImageUrl(null)).toBeNull();
  });
});

describe("classifier text for Google ads", () => {
  it("falls back to the image transcription when the row has no copy", () => {
    expect(enrichmentTextForAd(PLACEHOLDER, "google")).toBe("");
    expect(enrichmentTextForAd(PLACEHOLDER, "google", "Protezavimo konsultacija 0 €")).toBe("Protezavimo konsultacija 0 €");
  });

  it("keeps published copy when there is some", () => {
    expect(enrichmentTextForAd("Book your free check-up today", "meta", "ignored")).toBe("Book your free check-up today");
  });

  it("changes the content hash when a transcription arrives", () => {
    expect(enrichmentContentHash({ ad_text: PLACEHOLDER })).not.toBe(
      enrichmentContentHash({ ad_text: PLACEHOLDER, creative_text: "Konsultacija 0 €" }),
    );
  });
});
