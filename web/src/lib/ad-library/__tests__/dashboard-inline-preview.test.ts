import { describe, expect, it } from "vitest";

import {
  googleAdRowHasDashboardInlinePreview,
  metaAdHasDashboardInlinePreview,
} from "@/lib/ad-library/dashboard-inline-preview";
import type { GoogleAdRow, MetaAdCard } from "@/lib/ad-library/normalize";

function baseMeta(over: Partial<MetaAdCard> = {}): MetaAdCard {
  return {
    id: "1",
    headline: "h",
    desc: "d",
    cta: "c",
    subtext: "",
    img: "",
    isVideo: false,
    adLibraryUrl: "https://www.facebook.com/ads/library/?id=1",
    pageName: "P",
    ...over,
  };
}

describe("dashboard-inline-preview", () => {
  it("Meta: image counts; video only when isVideo", () => {
    expect(metaAdHasDashboardInlinePreview(baseMeta({ img: " https://x.test/a.jpg " }))).toBe(true);
    expect(metaAdHasDashboardInlinePreview(baseMeta({ videoUrl: "https://v.test/x.mp4", isVideo: true }))).toBe(
      true
    );
    expect(metaAdHasDashboardInlinePreview(baseMeta({ videoUrl: "https://v.test/x.mp4", isVideo: false }))).toBe(
      false
    );
    expect(metaAdHasDashboardInlinePreview(baseMeta())).toBe(false);
  });

  it("Google: transparency row needs usable still, not empty creative", () => {
    const textOnly: GoogleAdRow = {
      type: "google",
      id: "g1",
      title: "t",
      url: "x.com",
      desc: "d",
      img: null,
      adUrl: "https://adstransparency.google.com/x",
    };
    expect(googleAdRowHasDashboardInlinePreview(textOnly)).toBe(false);
    const withImg: GoogleAdRow = {
      ...textOnly,
      img: "https://cdn.example.com/creative.jpg",
    };
    expect(googleAdRowHasDashboardInlinePreview(withImg)).toBe(true);
  });
});
