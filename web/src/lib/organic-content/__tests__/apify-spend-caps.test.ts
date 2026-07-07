import { describe, expect, it } from "vitest";

import {
  APIFY_TWITTER_MIN_SPEND_CAP_USD,
  twitterOrganicSpendCapUsd,
  youtubeShortsSpendCapUsd,
} from "../apify-spend-caps";

describe("apify-spend-caps", () => {
  it("defaults twitter cap to Apify minimum param ($3), not a billed minimum", () => {
    expect(twitterOrganicSpendCapUsd()).toBe(APIFY_TWITTER_MIN_SPEND_CAP_USD);
  });

  it("defaults youtube shorts cap to $1", () => {
    expect(youtubeShortsSpendCapUsd()).toBe(1);
  });
});
