import { describe, expect, it } from "vitest";

import { pickOrganicArchivablePreviewUrl } from "@/lib/organic-content/archive-organic-previews";

describe("pickOrganicArchivablePreviewUrl", () => {
  it("prefers stored media_urls over raw_data", () => {
    const url = pickOrganicArchivablePreviewUrl({
      id: "x",
      platform: "tiktok",
      media_urls: ["https://cdn.example/cover.jpg"],
      raw_data: { videoMeta: { coverUrl: "https://cdn.example/other.jpg" } },
    });
    expect(url).toBe("https://cdn.example/cover.jpg");
  });

  it("skips video urls", () => {
    const url = pickOrganicArchivablePreviewUrl({
      id: "x",
      platform: "tiktok",
      media_urls: ["https://cdn.example/video.mp4"],
      raw_data: { videoMeta: { coverUrl: "https://cdn.example/cover.jpg" } },
    });
    expect(url).toBe("https://cdn.example/cover.jpg");
  });
});
