import { describe, expect, it } from "vitest";

import { enrichOrganicPostForApi, organicPostDisplayFields } from "../post-display";
import { extractLinkedInMediaFromRaw, normalizeOrganicItem } from "../normalize";

const harvestapiDocumentPost = {
  type: "post",
  id: "7329207003942125568",
  linkedinUrl:
    "https://www.linkedin.com/posts/williamhgates_how-better-data-helped-us-cut-child-mortality-activity-7329207003942125568-_gfJ",
  content: "The leading causes of childhood death reveal a stark truth.",
  author: {
    universalName: null,
    publicIdentifier: "williamhgates",
    type: "profile",
    name: "Bill Gates",
    avatar: {
      url: "https://media.licdn.com/dms/image/v2/D5603AQF-RYZP55jmXA/profile-displayphoto-shrink_800_800/example.jpg",
    },
  },
  postedAt: {
    timestamp: 1747419119821,
    date: "2025-05-16T18:11:59.821Z",
  },
  postImages: [],
  document: {
    title: "How better data helped us cut child mortality in half",
    coverPages: [
      {
        width: 1921,
        height: 1243,
        imageUrls: [
          "https://media.licdn.com/dms/image/v2/D561FAQGPMwZUeWRF4w/feedshare-document-cover-images_1920/example.jpg",
        ],
      },
    ],
  },
  engagement: {
    likes: 2916,
    comments: 328,
    shares: 153,
  },
};

const harvestapiCompanyPost = {
  type: "post",
  id: "7391573088309534720",
  linkedinUrl: "https://www.linkedin.com/posts/adidas_example-activity-7391573088309534720-abcd",
  content: "Impossible is nothing.",
  author: {
    universalName: "adidas",
    publicIdentifier: "adidas",
    type: "company",
    name: "adidas",
    avatar: {
      url: "https://media.licdn.com/dms/image/v2/example/adidas-logo.jpg",
    },
  },
  postedAt: {
    date: "2026-06-01T10:00:00.000Z",
  },
  postImages: [
    {
      url: "https://media.licdn.com/dms/image/v2/example/adidas-campaign.jpg",
      width: 1200,
      height: 1200,
    },
  ],
  engagement: {
    likes: 420,
    comments: 18,
    shares: 9,
  },
};

describe("normalizeHarvestapiLinkedInPost", () => {
  it("maps document cover pages and engagement from harvestapi rows", () => {
    const normalized = normalizeOrganicItem("linkedin", harvestapiDocumentPost, 0);
    expect(normalized?.post_id).toBe("7329207003942125568");
    expect(normalized?.likes).toBe(2916);
    expect(normalized?.comments).toBe(328);
    expect(normalized?.shares).toBe(153);
    expect(normalized?.media_urls[0]).toContain("media.licdn.com");
    expect(normalized?.posted_at).toBe("2025-05-16T18:11:59.821Z");
  });

  it("maps company post images and author fields", () => {
    const normalized = normalizeOrganicItem("linkedin", harvestapiCompanyPost, 0);
    expect(normalized?.media_urls[0]).toContain("adidas-campaign.jpg");
    expect(normalized?.raw_data).toMatchObject({
      post_url: harvestapiCompanyPost.linkedinUrl,
      author_name: "adidas",
      author_username: "adidas",
    });

    const display = organicPostDisplayFields(normalized?.raw_data, "linkedin");
    expect(display).toMatchObject({
      post_url: harvestapiCompanyPost.linkedinUrl,
      author_username: "adidas",
      author_display_name: "adidas",
      media_aspect: "square",
    });
  });

  it("extractLinkedInMediaFromRaw repairs API responses", () => {
    expect(extractLinkedInMediaFromRaw(harvestapiCompanyPost)[0]).toContain("adidas-campaign.jpg");
    expect(
      enrichOrganicPostForApi({
        platform: "linkedin",
        media_urls: [],
        raw_data: harvestapiCompanyPost,
      }).media_urls[0],
    ).toContain("adidas-campaign.jpg");
  });
});
