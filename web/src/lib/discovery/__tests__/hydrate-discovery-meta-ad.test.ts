import { describe, expect, it } from "vitest";

import { hydrateDiscoveryMetaAdCard } from "@/lib/discovery/hydrate-discovery-meta-ad";
import type { DiscoveryAdDto } from "@/lib/discovery/types";
import type { MetaAdCard } from "@/lib/ad-library/normalize";

function baseDiscoveryAd(over: Partial<DiscoveryAdDto> = {}): DiscoveryAdDto {
  return {
    id: "ad-1",
    competitor_id: "comp-1",
    competitor_name: "Test Clinic",
    competitor_domain: "clinic.lt",
    competitor_logo_url: null,
    platform: "meta",
    format: "image",
    ad_text: "Promo",
    ad_creative_url: null,
    archived_creative_url: null,
    first_seen_at: "2026-01-01T00:00:00.000Z",
    last_seen_at: "2026-06-01T00:00:00.000Z",
    is_active: false,
    is_killed: true,
    impressions_index: null,
    is_ultimate_winner: false,
    raw_payload: {
      id: "123",
      headline: "Offer",
      desc: "Body",
      cta: "Learn more",
      subtext: "clinic.lt",
      img: "",
      isVideo: false,
      adLibraryUrl: "https://www.facebook.com/ads/library/?id=123",
      pageName: "Test Clinic",
    } satisfies MetaAdCard,
    ...over,
  };
}

describe("hydrateDiscoveryMetaAdCard", () => {
  it("repairs preview from snapshot when top-level img is empty", () => {
    const result = hydrateDiscoveryMetaAdCard(
      baseDiscoveryAd({
        raw_payload: {
          id: "123",
          headline: "Offer",
          desc: "Body",
          cta: "Learn more",
          subtext: "clinic.lt",
          img: "",
          isVideo: false,
          adLibraryUrl: "https://www.facebook.com/ads/library/?id=123",
          pageName: "Test Clinic",
          snapshot: {
            cards: [{ original_image_url: "https://scontent.xx.fbcdn.net/v/fresh.jpg" }],
          },
        },
      }),
    );
    expect(result?.card.img).toBe("https://scontent.xx.fbcdn.net/v/fresh.jpg");
  });

  it("falls back to archived creative when live CDN URL is expired", () => {
    const expired =
      "https://scontent.xx.fbcdn.net/v/t39.30808-6/expired.jpg?oe=5F000000";
    const archived = "https://storage.example.com/archived.jpg";
    const result = hydrateDiscoveryMetaAdCard(
      baseDiscoveryAd({
        ad_creative_url: expired,
        archived_creative_url: archived,
        raw_payload: {
          id: "123",
          headline: "Offer",
          desc: "Body",
          cta: "Learn more",
          subtext: "clinic.lt",
          img: expired,
          isVideo: false,
          adLibraryUrl: "https://www.facebook.com/ads/library/?id=123",
          pageName: "Test Clinic",
        },
      }),
    );
    expect(result?.card.img).toBe(archived);
    expect(result?.runStatus?.archivedCreativeUrl).toBe(archived);
  });

  it("uses ad_creative_url when raw payload has no image fields", () => {
    const live = "https://scontent.xx.fbcdn.net/v/live.jpg";
    const result = hydrateDiscoveryMetaAdCard(
      baseDiscoveryAd({
        ad_creative_url: live,
        raw_payload: {
          id: "123",
          headline: "Offer",
          desc: "Body",
          cta: "Learn more",
          subtext: "clinic.lt",
          img: "",
          isVideo: false,
          adLibraryUrl: "https://www.facebook.com/ads/library/?id=123",
          pageName: "Test Clinic",
        },
      }),
    );
    expect(result?.card.img).toBe(live);
  });
});
