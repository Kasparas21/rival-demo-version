import { describe, expect, it } from "vitest";

import { mergeMetaAdCards } from "@/lib/ad-library/merge-library-platform-ads";
import {
  hydrateMetaLibraryCardForDisplay,
  resolveMetaLibraryCardPreview,
} from "@/lib/ad-library/resolve-meta-library-card-preview";
import type { MetaAdCard } from "@/lib/ad-library/normalize";

function baseMeta(over: Partial<MetaAdCard> = {}): MetaAdCard {
  return {
    id: "123",
    headline: "Nike Guard Stay 2 Football Sleeve",
    desc: "Shop Nike",
    cta: "Install Now",
    subtext: "nike.com",
    img: "https://scontent.xx.fbcdn.net/v/expired-stale.jpg",
    isVideo: false,
    adLibraryUrl: "https://www.facebook.com/ads/library/?id=123",
    pageName: "Nike",
    ...over,
  };
}

describe("resolveMetaLibraryCardPreview", () => {
  it("prefers fresh snapshot image over stale merged img", () => {
    const stale = baseMeta();
    const fresh = baseMeta({
      img: "",
      snapshot: {
        cards: [{ original_image_url: "https://scontent.xx.fbcdn.net/v/fresh-product.jpg" }],
      },
    });
    const merged = mergeMetaAdCards([stale], [fresh], { maxItems: 10, nowMs: Date.now() })[0];
    expect(merged?.img).toBe("https://scontent.xx.fbcdn.net/v/fresh-product.jpg");
    expect(resolveMetaLibraryCardPreview(merged!)).toBe(
      "https://scontent.xx.fbcdn.net/v/fresh-product.jpg",
    );
  });

  it("hydrates display cards with resolved preview and video poster", () => {
    const hydrated = hydrateMetaLibraryCardForDisplay(
      baseMeta({
        img: "",
        isVideo: true,
        videoUrl: "https://video.xx.fbcdn.net/v/sample.mp4",
        snapshot: {
          cards: [{ video_preview_image_url: "https://scontent.xx.fbcdn.net/v/poster.jpg" }],
        },
      }),
    );
    expect(hydrated.img).toBe("https://scontent.xx.fbcdn.net/v/poster.jpg");
    expect(hydrated.isVideo).toBe(true);
    expect(hydrated.videoUrl).toBe("https://video.xx.fbcdn.net/v/sample.mp4");
  });

  it("keeps playable video when poster is missing", () => {
    const hydrated = hydrateMetaLibraryCardForDisplay(
      baseMeta({
        img: "",
        isVideo: true,
        videoUrl: "https://video.xx.fbcdn.net/v/sample.mp4",
        snapshot: { cards: [{ video_hd_url: "https://video.xx.fbcdn.net/v/sample.mp4" }] },
      }),
    );
    expect(hydrated.img).toBe("");
    expect(hydrated.isVideo).toBe(true);
    expect(hydrated.videoUrl).toBe("https://video.xx.fbcdn.net/v/sample.mp4");
  });
});
