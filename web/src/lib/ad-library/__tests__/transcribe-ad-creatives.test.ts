import { describe, expect, it } from "vitest";

import {
  creativeImageUrl,
  creativeSource,
  isUnusableTranscription,
  previewScriptText,
} from "@/lib/ad-library/transcribe-ad-creatives";
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

describe("preview scripts (shopping, local and rich display ads)", () => {
  it("are read as a source of their own", () => {
    expect(creativeSource({ img: "https://displayads-formats.googleusercontent.com/ads/preview/content.js?x=1" })).toEqual({
      kind: "preview_script",
      url: "https://displayads-formats.googleusercontent.com/ads/preview/content.js?x=1",
    });
  });

  it("yield the ad's visible text from the escaped HTML", () => {
    const js =
      'f("\\x3cdiv\\x3eLocal Ad Rendering Service\\x3c/div\\x3e\\x3cspan\\x3eRemiama\\x3c/span\\x3e' +
      '\\x3cdiv\\x3eAll on 4 kaina\\x3c/div\\x3e\\x3cdiv\\x3eRothy\\x26#39;s \\x26amp; co\\x3c/div\\x3e' +
      '\\x3cdiv\\x3e[Price]\\x3c/div\\x3e")';
    expect(previewScriptText(js)).toBe("All on 4 kaina\nRothy's & co");
    expect(previewScriptText("function(){return 1}")).toBeNull();
    expect(previewScriptText('x("\\x3cb\\x3eProduct Listing Ad Rendering Service\\x3c/b\\x3e\\x3cb\\x3eThe Daily Flat, Size 5.5\\x3c/b\\x3e")')).toBe(
      "Google Shopping ad: The Daily Flat, Size 5.5",
    );
  });
});

describe("isUnusableTranscription", () => {
  it("rejects error pages, icons and unfilled templates", () => {
    expect(isUnusableTranscription("500. That's an error. There was an error.")).toBe(true);
    expect(isUnusableTranscription("Image: An information icon in a teal circle.")).toBe(true);
    expect(isUnusableTranscription("Sponsored | <Rating (Reviews)> · <Category>")).toBe(true);
    expect(isUnusableTranscription("Protezavimo Konsultacija 0 €")).toBe(false);
  });
});
