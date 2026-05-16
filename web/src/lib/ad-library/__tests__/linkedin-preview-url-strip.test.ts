import { describe, expect, it } from "vitest";
import { linkedInItemToCard } from "@/lib/ad-library/normalize";

describe("LinkedIn scraper description — removes Ad Library preview short links", () => {
  it("drops trailing line that is only bit.ly + trk=ad_library_ad_preview_content", () => {
    const card = linkedInItemToCard(
      {
        id: "123",
        headline: "Senior UX researcher",
        description:
          "We are hiring!\nGrow with us.\nbit.ly/4ndpidi?trk=ad_library_ad_preview_content",
      },
      0
    );
    expect(card.desc).toContain("We are hiring");
    expect(card.desc).not.toMatch(/bit\.ly/i);
    expect(card.desc).not.toMatch(/trk=ad_library_ad_preview_content/i);
  });

  it("strips snippet URL from end of inline copy", () => {
    const card = linkedInItemToCard(
      {
        id: "124",
        headline: "Offer",
        description: "Learn more https://bit.ly/499L3EW?trk=ad_library_ad_preview_content",
      },
      0
    );
    expect(card.desc).toContain("Learn more");
    expect(card.desc).not.toMatch(/bit\.ly/i);
  });
});
