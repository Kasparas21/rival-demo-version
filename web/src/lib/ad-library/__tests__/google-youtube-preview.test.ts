import { describe, expect, it } from "vitest";
import {
  googleAdRowPreviewLikelihood,
  googleItemToRow,
  normalizeGoogleApiItem,
  type GoogleAdRow,
} from "@/lib/ad-library/normalize";

describe("Google YouTube / video ad previews", () => {
  it("pulls YouTube poster from a nested watch URL when Transparency has no image", () => {
    const raw = {
      format: "YouTube",
      advertiserId: "AR123",
      creativeId: "CR456",
      advertiserName: "PUMA SE",
      domain: "puma.com",
      adUrl: "https://adstransparency.google.com/advertiser/AR123/creative/CR456",
      variants: [
        {
          landingPage: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        },
      ],
    };
    const item = normalizeGoogleApiItem(raw);
    expect(item.youtubeVideoId).toBe("dQw4w9WgXcQ");
    const row = googleItemToRow(item, 0, { queryDomain: "puma.com" });
    if (row.type !== "youtube") throw new Error("expected youtube row");
    expect(row.thumbnail).toContain("img.youtube.com/vi/dQw4w9WgXcQ/");
    expect(row.youtubeVideoId).toBe("dQw4w9WgXcQ");
  });

  it("maps Apify Google VIDEO row: content.js preview is ignored, googlevideo URL becomes card videoUrl", () => {
    const raw = {
      advertiserId: "AR05343765221255151617",
      advertiserName: "PUMA SE",
      creativeId: "CR17553116694019309569",
      format: "VIDEO",
      firstShown: "2026-03-27",
      lastShown: "2026-05-10",
      previewUrl:
        "https://displayads-formats.googleusercontent.com/ads/preview/content.js?client=ads-integrity-transparency&obfuscatedCustomerId=9549081188&creativeId=802191275946",
      imageUrl: null,
      videoUrl:
        "https://rr5---sn-p5qlsnrr.googlevideo.com/videoplayback?expire=1778452940&source=youtube&mime=video/mp4",
      adLibraryUrl:
        "https://adstransparency.google.com/advertiser/AR05343765221255151617/creative/CR17553116694019309569",
    };
    const item = normalizeGoogleApiItem(raw);
    expect(item.creativeVideoUrl).toContain("googlevideo.com/videoplayback");
    expect(item.previewUrl).toContain("content.js");
    expect(item.imageUrl).toBeNull();
    const row = googleItemToRow(item, 0, { queryDomain: "puma.com" });
    if (row.type !== "youtube") throw new Error("expected youtube row");
    expect(row.videoUrl).toContain("googlevideo.com/videoplayback");
    expect(row.thumbnail || "").toBe("");
    expect(row.youtubeVideoId).toBeNull();
  });

  it("googleAdRowPreviewLikelihood ranks video+thumbnail above empty video creative", () => {
    const rich: Extract<GoogleAdRow, { type: "youtube" }> = {
      type: "youtube",
      id: "a",
      title: "t",
      channel: "c",
      views: "v",
      thumbnail: "https://img.youtube.com/vi/abcdEFAULT12/hqdefault.jpg",
      youtubeVideoId: "abcdEFAULT12",
      videoUrl: "https://example.com/v.mp4",
      adUrl: "https://adstransparency.google.com/x",
      format: "VIDEO",
    };
    const poor: Extract<GoogleAdRow, { type: "youtube" }> = {
      ...rich,
      id: "b",
      thumbnail: "",
      youtubeVideoId: null,
      videoUrl: null,
    };
    expect(googleAdRowPreviewLikelihood(rich) > googleAdRowPreviewLikelihood(poor)).toBe(true);
  });
});
