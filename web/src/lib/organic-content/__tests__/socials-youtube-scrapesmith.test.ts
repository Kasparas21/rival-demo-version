import { describe, expect, it } from "vitest";

import { ORGANIC_SCRAPE_MAX_ITEMS } from "../constants";
import {
  buildApidojoYouTubeVideosInput,
  buildCalmBuilderYouTubeShortsInput,
  buildPlatformActorInput,
  buildYouTubeChannelScrapeAttempts,
  buildYouTubeSearchFallbackInput,
  deriveYoutubeSearchSlugs,
  filterYouTubePostsByChannelId,
  filterYouTubePostsForChannel,
  filterYouTubePostsForHandle,
  youtubeChannelBaseUrl,
  youtubeChannelInputForCalmBuilder,
  youtubeUploadsPlaylistUrl,
} from "../socials";
import { normalizeOrganicItem } from "../normalize";
import type { NormalizedOrganicPost } from "../types";

describe("youtubeChannelBaseUrl", () => {
  it("normalizes @handle to channel URL", () => {
    expect(youtubeChannelBaseUrl("@adidas")).toBe("https://www.youtube.com/@adidas");
  });

  it("strips /videos or /shorts suffix from full URLs", () => {
    expect(youtubeChannelBaseUrl("https://www.youtube.com/@adidas/videos")).toBe(
      "https://www.youtube.com/@adidas",
    );
    expect(youtubeChannelBaseUrl("https://www.youtube.com/@adidas/shorts")).toBe(
      "https://www.youtube.com/@adidas",
    );
  });

  it("preserves /channel/UC… URLs", () => {
    expect(youtubeChannelBaseUrl("https://www.youtube.com/channel/UCuLUOxd7ezJ8c6NSLBNRRfg")).toBe(
      "https://www.youtube.com/channel/UCuLUOxd7ezJ8c6NSLBNRRfg",
    );
  });

  it("strips @ prefix from pasted channel URLs", () => {
    expect(
      youtubeChannelBaseUrl("@https://www.youtube.com/channel/UCuLUOxd7ezJ8c6NSLBNRRfg"),
    ).toBe("https://www.youtube.com/channel/UCuLUOxd7ezJ8c6NSLBNRRfg");
  });
});

describe("buildPlatformActorInput youtube calm_builder", () => {
  it("uses calm_builder Shorts-only channel input", () => {
    expect(buildPlatformActorInput("youtube", "@adidas")).toEqual({
      channelInputs: ["@adidas"],
      includeChannelVideos: false,
      includeChannelShorts: true,
      maxChannelVideos: 0,
      maxChannelShorts: ORGANIC_SCRAPE_MAX_ITEMS,
      channelDateRangeSortBy: "latest",
      scrapeDetailedVideoData: false,
      scrapeCommentsAndReplies: false,
      scrapeChannelInfo: false,
    });
  });

  it("maps channel UC URL to itself for channelInputs", () => {
    expect(
      youtubeChannelInputForCalmBuilder(
        "https://www.youtube.com/channel/UCuLUOxd7ezJ8c6NSLBNRRfg",
      ),
    ).toBe("https://www.youtube.com/channel/UCuLUOxd7ezJ8c6NSLBNRRfg");
    expect(buildCalmBuilderYouTubeShortsInput("@adidas").channelInputs).toEqual(["@adidas"]);
  });

  it("builds apidojo long-form-only input", () => {
    expect(buildApidojoYouTubeVideosInput("@adidas")).toEqual({
      youtubeHandles: ["@adidas"],
      startUrls: ["https://www.youtube.com/@adidas/videos"],
      maxItems: ORGANIC_SCRAPE_MAX_ITEMS,
      includeShorts: false,
    });
  });
});

describe("buildPlatformActorInput youtube scrapesmith legacy", () => {
  it("builds ordered channel scrape attempts", () => {
    expect(buildYouTubeChannelScrapeAttempts("https://www.youtube.com/@adidas")).toEqual([
      { channelUrls: ["https://www.youtube.com/@adidas"], maxVideosPerQuery: ORGANIC_SCRAPE_MAX_ITEMS },
      {
        searchUrls: ["https://www.youtube.com/@adidas/videos"],
        maxVideosPerQuery: ORGANIC_SCRAPE_MAX_ITEMS,
      },
      {
        channelUrls: ["https://www.youtube.com/@adidas/shorts"],
        maxVideosPerQuery: Math.ceil(ORGANIC_SCRAPE_MAX_ITEMS / 2),
      },
    ]);
  });

  it("builds search fallback input from handle", () => {
    expect(buildYouTubeSearchFallbackInput("@adidas")).toEqual({
      searchTerms: ["@adidas", "adidas"],
      maxVideosPerQuery: 30,
    });
  });

  it("does not build search fallback for full channel URLs alone", () => {
    expect(
      buildYouTubeSearchFallbackInput(
        "@https://www.youtube.com/channel/UCuLUOxd7ezJ8c6NSLBNRRfg",
      ),
    ).toBeNull();
    expect(
      buildYouTubeSearchFallbackInput("https://www.youtube.com/channel/UCuLUOxd7ezJ8c6NSLBNRRfg"),
    ).toBeNull();
  });

  it("builds search fallback for channel URL when brand slug is provided", () => {
    expect(
      buildYouTubeSearchFallbackInput(
        "https://www.youtube.com/channel/UCuLUOxd7ezJ8c6NSLBNRRfg",
        30,
        ["adidas"],
      ),
    ).toEqual({
      searchTerms: ["@adidas", "adidas"],
      maxVideosPerQuery: 30,
    });
  });

  it("builds search fallback from @handle URL", () => {
    expect(buildYouTubeSearchFallbackInput("https://www.youtube.com/@adidas")).toEqual({
      searchTerms: ["@adidas", "adidas"],
      maxVideosPerQuery: 30,
    });
  });

  it("builds uploads playlist URL from channel id", () => {
    expect(youtubeUploadsPlaylistUrl("UCuLUOxd7ezJ8c6NSLBNRRfg")).toBe(
      "https://www.youtube.com/playlist?list=UUuLUOxd7ezJ8c6NSLBNRRfg",
    );
  });

  it("derives search slugs from brand name and other socials", () => {
    expect(
      deriveYoutubeSearchSlugs(
        { instagram: "@adidas" },
        "https://www.youtube.com/channel/UCuLUOxd7ezJ8c6NSLBNRRfg",
        "Adidas",
      ),
    ).toEqual(["adidas"]);
  });
});

describe("filterYouTubePostsForHandle", () => {
  const adidasPost: NormalizedOrganicPost = {
    platform: "youtube",
    post_id: "abc",
    content: "test",
    likes: 1,
    comments: 0,
    shares: 0,
    views: 100,
    media_urls: [],
    tagged_accounts: [],
    co_authors: [],
    raw_data: {
      channel_name: "adidas",
      channel_url: "https://www.youtube.com/@adidas",
    },
  };

  it("keeps posts from the target channel", () => {
    expect(filterYouTubePostsForHandle([adidasPost], "@adidas")).toHaveLength(1);
  });

  it("drops unrelated search results", () => {
    const other: NormalizedOrganicPost = {
      ...adidasPost,
      post_id: "xyz",
      raw_data: { channel_name: "nike", channel_url: "https://www.youtube.com/@nike" },
    };
    expect(filterYouTubePostsForHandle([adidasPost, other], "@adidas")).toHaveLength(1);
  });

  it("matches stored https://youtube.com/@adidas URLs", () => {
    expect(filterYouTubePostsForHandle([adidasPost], "https://www.youtube.com/@adidas")).toHaveLength(1);
  });

  it("keeps Shorts rows without channel_id when channel_name matches", () => {
    const short = normalizeOrganicItem(
      "youtube",
      {
        video_id: "short1",
        title: "Short",
        channel_name: "adidas",
        channel_url: "https://www.youtube.com/@adidas",
        video_url: "https://www.youtube.com/shorts/short1",
        thumbnail: "https://example.com/t.jpg",
      },
      0,
    );
    expect(short).toBeTruthy();
    const filtered = filterYouTubePostsForChannel(
      [short!, adidasPost],
      "https://www.youtube.com/channel/UCuLUOxd7ezJ8c6NSLBNRRfg",
      "UCuLUOxd7ezJ8c6NSLBNRRfg",
      ["adidas"],
    );
    expect(filtered.map((p) => p.post_id)).toEqual(["short1", "abc"]);
  });
});

describe("filterYouTubePostsByChannelId", () => {
  it("keeps rows with matching UC channel id", () => {
    const official: NormalizedOrganicPost = {
      platform: "youtube",
      post_id: "1",
      content: "official",
      likes: 1,
      comments: 0,
      shares: 0,
      views: 1,
      media_urls: [],
      tagged_accounts: [],
      co_authors: [],
      raw_data: { channel_id: "UCuLUOxd7ezJ8c6NSLBNRRfg" },
    };
    const other: NormalizedOrganicPost = {
      ...official,
      post_id: "2",
      raw_data: { channel_id: "UCotherchannel000" },
    };
    expect(
      filterYouTubePostsByChannelId([official, other], "UCuLUOxd7ezJ8c6NSLBNRRfg"),
    ).toHaveLength(1);
  });
});
