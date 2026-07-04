import { describe, expect, it } from "vitest";

import {
  googleAdRowHasDashboardInlinePreview,
  metaAdHasDashboardInlinePreview,
  pickDashboardInlinePreviewAds,
  prioritizeRunningDashboardInlinePreviewAds,
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
  it("Meta: requires a still image URL (video poster counts)", () => {
    expect(metaAdHasDashboardInlinePreview(baseMeta({ img: " https://x.test/a.jpg " }))).toBe(true);
    expect(
      metaAdHasDashboardInlinePreview(
        baseMeta({ img: "https://x.test/poster.jpg", videoUrl: "https://v.test/x.mp4", isVideo: true }),
      ),
    ).toBe(true);
    expect(metaAdHasDashboardInlinePreview(baseMeta({ videoUrl: "https://v.test/x.mp4", isVideo: true }))).toBe(
      false,
    );
    expect(metaAdHasDashboardInlinePreview(baseMeta({ videoUrl: "https://v.test/x.mp4", isVideo: false }))).toBe(
      false,
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

  it("prioritizeRunningDashboardInlinePreviewAds: active first, inactive fills gaps", () => {
    const ads = [
      { id: "ended-preview", running: false, preview: true },
      { id: "active-no-preview", running: true, preview: false },
      { id: "active-preview", running: true, preview: true },
      { id: "ended-no-preview", running: false, preview: false },
      { id: "ended-preview-2", running: false, preview: true },
    ];
    const picked = prioritizeRunningDashboardInlinePreviewAds(
      ads,
      (ad) => ad.running,
      (ad) => ad.preview,
    );
    expect(picked.map((a) => a.id)).toEqual(["active-preview", "ended-preview", "ended-preview-2"]);
  });

  it("pickDashboardInlinePreviewAds: falls back to cards without preview when needed", () => {
    const ads = [
      { id: "active-no-preview", running: true, preview: false },
      { id: "ended-preview", running: false, preview: true },
      { id: "ended-no-preview", running: false, preview: false },
    ];
    const picked = pickDashboardInlinePreviewAds(
      ads,
      (ad) => ad.running,
      (ad) => ad.preview,
      3,
      (ad) => ad.id,
    );
    expect(picked.map((a) => a.id)).toEqual(["ended-preview", "active-no-preview", "ended-no-preview"]);
  });
});
