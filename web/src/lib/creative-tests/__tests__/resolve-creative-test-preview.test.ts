import { describe, expect, it } from "vitest";

import { resolveCreativeTestPreviewUrl } from "@/lib/creative-tests/resolve-creative-test-preview";

describe("resolveCreativeTestPreviewUrl", () => {
  it("reads Meta preview from raw_payload when ad_creative_url is empty", () => {
    const url = resolveCreativeTestPreviewUrl({
      platform: "meta",
      ad_creative_url: null,
      archived_creative_url: null,
      raw_payload: {
        id: "123",
        img: "",
        isVideo: false,
        snapshot: {
          cards: [{ original_image_url: "https://scontent.xx.fbcdn.net/v/shoe.jpg" }],
        },
      },
    });
    expect(url).toBe("https://scontent.xx.fbcdn.net/v/shoe.jpg");
  });
});
