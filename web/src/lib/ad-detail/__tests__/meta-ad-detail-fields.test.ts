import { describe, expect, it } from "vitest";
import {
  formatMetaPublisherPlatformsLine,
  metaBroadAudienceDetailLabel,
  metaEuRegionDetailLabel,
  metaPrimaryDescriptionFromPayload,
  metaPublisherDetailRows,
  metaTitleFromPayload,
} from "@/lib/ad-detail/meta-ad-detail-fields";

describe("meta ad detail helpers", () => {
  it("formats publisher_platform as human labels", () => {
    expect(
      formatMetaPublisherPlatformsLine({
        publisher_platform: ["FACEBOOK", "INSTAGRAM", "THREADS"],
      })
    ).toBe("Facebook · Instagram · Threads");
    const rows = metaPublisherDetailRows({ publisher_platform: ["FACEBOOK", "INSTAGRAM"] });
    expect(rows?.map((r) => r.key)).toEqual(["FACEBOOK", "INSTAGRAM"]);
  });

  it("maps EU region when targets_eu is true", () => {
    expect(metaEuRegionDetailLabel({ targets_eu: true })).toBe("EU");
    expect(metaEuRegionDetailLabel({ targetsEu: true })).toBe("EU");
    expect(metaEuRegionDetailLabel({ targets_eu: false })).toBeNull();
  });

  it('maps gender_audience "All" to broad audience copy', () => {
    expect(metaBroadAudienceDetailLabel({ gender_audience: "All" })).toBe("All ages · All genders");
    expect(metaBroadAudienceDetailLabel({ genderAudience: "all" })).toBe("All ages · All genders");
    expect(metaBroadAudienceDetailLabel({ gender_audience: "Men" })).toBeNull();
  });

  it("extracts Meta title (link headline)", () => {
    expect(metaTitleFromPayload({ headline: "Samba Classic Boots" })).toBe("Samba Classic Boots");
    expect(metaTitleFromPayload({ linkHeadline: "A", headline: "B" })).toBe("A");
    expect(metaTitleFromPayload({})).toBeNull();
  });

  it("extracts Meta primary description", () => {
    expect(metaPrimaryDescriptionFromPayload({ desc: "Take it up a notch" })).toBe("Take it up a notch");
    expect(metaPrimaryDescriptionFromPayload({})).toBeNull();
  });
});
