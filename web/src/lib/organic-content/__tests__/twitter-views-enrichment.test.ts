import { describe, expect, it } from "vitest";

import type { NormalizedOrganicPost } from "../types";
import { mergeTwitterViewsIntoPosts, twitterPostUrlFromPost } from "../twitter-views-enrichment";

const basePost: NormalizedOrganicPost = {
  platform: "twitter",
  post_id: "2069772479283810730",
  content: "Happy Birthday Lionel Andrés Messi 🐐",
  media_urls: ["https://pbs.twimg.com/media/HMHTVqIXcAA8ItU.jpg"],
  likes: 25179,
  comments: 106,
  shares: 4930,
  views: 0,
  posted_at: "2026-06-24T13:19:48.000Z",
  tagged_accounts: [],
  co_authors: [],
  raw_data: {
    id: "2069772479283810730",
    url: "https://x.com/adidas/status/2069772479283810730",
    full_text: "Happy Birthday Lionel Andrés Messi 🐐",
    favorite_count: 25179,
  },
};

describe("twitterPostUrlFromPost", () => {
  it("uses url from raw_data when present", () => {
    expect(twitterPostUrlFromPost(basePost)).toBe("https://x.com/adidas/status/2069772479283810730");
  });

  it("falls back to x.com/i/status when url is missing", () => {
    expect(
      twitterPostUrlFromPost({
        ...basePost,
        raw_data: { id: "2069772479283810730" },
      }),
    ).toBe("https://x.com/i/status/2069772479283810730");
  });
});

describe("mergeTwitterViewsIntoPosts", () => {
  it("merges view counts and raw_data from enrichment rows", () => {
    const enriched = mergeTwitterViewsIntoPosts([basePost], [
      {
        id: "2069772479283810730",
        view_count_info: { count: "2150620", state: "EnabledWithCount" },
        favorite_count: 25179,
      },
    ]);

    expect(enriched[0]?.views).toBe(2150620);
    expect(enriched[0]?.raw_data).toMatchObject({
      id: "2069772479283810730",
      view_count_info: { count: "2150620", state: "EnabledWithCount" },
      favorite_count: 25179,
    });
  });

  it("ignores enrichment rows for other tweet ids", () => {
    const enriched = mergeTwitterViewsIntoPosts([basePost], [
      {
        id: "999",
        view_count_info: { count: "100", state: "EnabledWithCount" },
      },
    ]);

    expect(enriched[0]?.views).toBe(0);
  });
});
