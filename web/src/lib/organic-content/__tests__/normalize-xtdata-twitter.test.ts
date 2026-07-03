import { describe, expect, it } from "vitest";

import { normalizeOrganicItem } from "../normalize";
import { buildPlatformActorInput } from "../socials";

const adidasRetweetRow = {
  id: "2072264051183264016",
  url: "https://x.com/adidas/status/2072264051183264016",
  author: {
    screen_name: "adidas",
    name: "adidas",
    profile_image_url_https: "https://pbs.twimg.com/profile_images/2052302029268164609/YAtZ75Su_normal.jpg",
  },
  full_text:
    "RT @adidasfootball: WHAT A TEAM 😍😍\nQUÉ EQUIPO 😍😍\n\n#YouGotThis https://t.co/YFfwTv74h3",
  favorite_count: 0,
  retweet_count: 646,
  reply_count: 0,
  created_at: "Wed Jul 01 10:20:25 +0000 2026",
  extended_entities: {
    media: [
      {
        media_url_https: "https://pbs.twimg.com/media/HMHTVqIXcAA8ItU.jpg",
        type: "photo",
      },
    ],
  },
};

const adidasOriginalTweet = {
  id: "2069772479283810730",
  url: "https://x.com/adidas/status/2069772479283810730",
  author: {
    screen_name: "adidas",
    name: "adidas",
    profile_image_url_https: "https://pbs.twimg.com/profile_images/2052302029268164609/YAtZ75Su_normal.jpg",
  },
  full_text: "Happy Birthday Lionel Andrés Messi 🐐 https://t.co/KAEFUuaXby",
  favorite_count: 25179,
  retweet_count: 4930,
  reply_count: 106,
  created_at: "Tue Jun 24 13:19:48 +0000 2026",
  extended_entities: {
    media: [
      {
        media_url_https: "https://pbs.twimg.com/media/HMHTVqIXcAA8ItU.jpg",
        type: "photo",
        original_info: { width: 1080, height: 1440 },
      },
    ],
  },
  entities: {
    user_mentions: [],
  },
};

const adidasVideoTweet = {
  id: "2063697799112282323",
  url: "https://x.com/adidas/status/2063697799112282323",
  author: {
    screen_name: "adidas",
    name: "adidas",
  },
  full_text: "He always knew this moment would come. Now the world knows it too 🏆#YouGotThis",
  favorite_count: 210755,
  retweet_count: 1530,
  reply_count: 133,
  created_at: "Sat Jun 07 19:01:00 +0000 2026",
  extended_entities: {
    media: [
      {
        media_url_https: "https://pbs.twimg.com/amplify_video_thumb/123/img/thumb.jpg",
        type: "video",
        video_info: {
          variants: [
            { content_type: "video/mp4", bitrate: 950000, url: "https://video.twimg.com/vid/480.mp4" },
            { content_type: "video/mp4", bitrate: 2176000, url: "https://video.twimg.com/vid/720.mp4" },
          ],
        },
      },
    ],
  },
};

describe("normalizeXtdataTwitterPost", () => {
  it("skips retweets when full_text starts with RT @", () => {
    expect(normalizeOrganicItem("twitter", adidasRetweetRow, 0)).toBeNull();
  });

  it("maps original tweet fields from xtdata payload", () => {
    const normalized = normalizeOrganicItem("twitter", adidasOriginalTweet, 0);
    expect(normalized).not.toBeNull();
    expect(normalized?.post_id).toBe("2069772479283810730");
    expect(normalized?.content).toBe("Happy Birthday Lionel Andrés Messi 🐐");
    expect(normalized?.likes).toBe(25179);
    expect(normalized?.comments).toBe(106);
    expect(normalized?.shares).toBe(4930);
    expect(normalized?.media_urls[0]).toBe("https://pbs.twimg.com/media/HMHTVqIXcAA8ItU.jpg");
    expect(normalized?.posted_at).toBe(new Date("Tue Jun 24 13:19:48 +0000 2026").toISOString());
  });

  it("extracts video thumbnail and highest-bitrate mp4", () => {
    const normalized = normalizeOrganicItem("twitter", adidasVideoTweet, 0);
    expect(normalized?.media_urls).toContain("https://pbs.twimg.com/amplify_video_thumb/123/img/thumb.jpg");
    expect(normalized?.media_urls).toContain("https://video.twimg.com/vid/720.mp4");
  });

  it("maps views from views.count and nested view_count_info", () => {
    const withViewsObject = {
      ...adidasOriginalTweet,
      views: { count: "215062", state: "EnabledWithCount" },
    };
    expect(normalizeOrganicItem("twitter", withViewsObject, 0)?.views).toBe(215062);

    const withGraphqlResultSibling = {
      ...adidasOriginalTweet,
      result: {
        rest_id: adidasOriginalTweet.id,
        view_count_info: { count: "4200000", state: "EnabledWithCount" },
      },
    };
    expect(normalizeOrganicItem("twitter", withGraphqlResultSibling, 0)?.views).toBe(4200000);

    const withNestedViews = {
      id: "1",
      url: "https://x.com/adidas/status/1",
      full_text: "Hello world",
      favorite_count: 1,
      retweeted_status_result: {
        result: {
          rest_id: "999",
          view_count_info: { count: "999999" },
        },
      },
    };
    expect(normalizeOrganicItem("twitter", withNestedViews, 0)?.views).toBe(0);
  });
});

describe("buildPlatformActorInput twitter", () => {
  it("uses twitterHandles with Latest sort", () => {
    const input = buildPlatformActorInput("twitter", "@adidas");
    expect(input.twitterHandles).toEqual(["adidas"]);
    expect(input.maxItems).toBe(20);
    expect(input.sort).toBe("Latest");
    expect(input).not.toHaveProperty("searchTerms");
  });

  it("extracts username from x.com profile URLs", () => {
    const input = buildPlatformActorInput("twitter", "https://x.com/adidas");
    expect(input.twitterHandles).toEqual(["adidas"]);
  });
});
