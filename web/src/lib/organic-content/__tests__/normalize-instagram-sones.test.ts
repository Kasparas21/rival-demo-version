import { describe, expect, it } from "vitest";

import { normalizeOrganicItem } from "../normalize";
import { buildPlatformActorInput } from "../socials";
import { organicPostDisplayFields } from "../post-display";

const calaiFeedPost = {
  pk: "3575419123901651887",
  id: "3575419123901651887_65949211561",
  code: "DGecL_zS9uv",
  taken_at: 1740443195,
  media_type: 1,
  product_type: "feed",
  caption: {
    pk: "18344011441147918",
    text: "Download Cal AI today! The future of calorie tracking 🎯",
  },
  like_count: 3399,
  comment_count: 180,
  image_url: "https://instagram.example/calai-feed.jpg",
  post_url: "https://www.instagram.com/p/DGecL_zS9uv/",
};

const calaiCollabPost = {
  pk: "3601469871251556973",
  id: "3601469871251556973_63957077107",
  code: "DH6_cQ5OIpt",
  taken_at: 1743548769,
  media_type: 2,
  product_type: "clips",
  caption: {
    pk: "18054749786234144",
    text: "Calories> everything when it comes to changing the number on the scale @calai.app #caloriesincaloriesout",
  },
  like_count: 155,
  comment_count: 7,
  play_count: 19482,
  image_url: "https://instagram.example/calai-collab.jpg",
  video_url: "https://instagram.example/calai-collab.mp4",
  post_url: "https://www.instagram.com/p/DH6_cQ5OIpt/",
  usertags: {
    in: [
      {
        user: {
          pk: "65949211561",
          username: "calai.app",
          full_name: "Cal AI - Calorie Tracker",
        },
      },
    ],
  },
  coauthor_producers: [
    {
      pk: "65949211561",
      username: "calai.app",
      full_name: "Cal AI - Calorie Tracker",
    },
  ],
};

describe("normalizeInstagramSonesPost", () => {
  it("maps calai.app feed post fields from Sones actor output", () => {
    const normalized = normalizeOrganicItem("instagram", calaiFeedPost, 0);
    expect(normalized).not.toBeNull();
    expect(normalized?.post_id).toBe("DGecL_zS9uv");
    expect(normalized?.content).toBe("Download Cal AI today! The future of calorie tracking 🎯");
    expect(normalized?.posted_at).toBe(new Date(1740443195 * 1000).toISOString());
    expect(normalized?.likes).toBe(3399);
    expect(normalized?.comments).toBe(180);
    expect(normalized?.media_urls[0]).toBe("https://instagram.example/calai-feed.jpg");
  });

  it("maps collaborators on collab reels", () => {
    const normalized = normalizeOrganicItem("instagram", calaiCollabPost, 1);
    expect(normalized?.post_id).toBe("DH6_cQ5OIpt");
    expect(normalized?.views).toBe(19482);
    expect(normalized?.media_urls[0]).toBe("https://instagram.example/calai-collab.jpg");
    expect(normalized?.tagged_accounts.some((a) => a.username === "calai.app")).toBe(true);
    expect(normalized?.co_authors.some((a) => a.username === "calai.app")).toBe(true);
  });
});

describe("buildPlatformActorInput instagram", () => {
  it("uses postsPerProfile and optional newerThan", () => {
    const input = buildPlatformActorInput("instagram", "@calai.app", {
      newerThan: "2026-01-01T00:00:00.000Z",
    });
    expect(input.usernames).toEqual(["calai.app"]);
    expect(input.postsPerProfile).toBe(20);
    expect(input.newerThan).toBe("2026-01-01T00:00:00.000Z");
    expect(input).not.toHaveProperty("resultsLimit");
  });
});

describe("organicPostDisplayFields", () => {
  it("extracts post_url and product_type from raw_data", () => {
    expect(organicPostDisplayFields(calaiFeedPost, "instagram")).toMatchObject({
      post_url: "https://www.instagram.com/p/DGecL_zS9uv/",
      product_type: "feed",
    });
  });
});
