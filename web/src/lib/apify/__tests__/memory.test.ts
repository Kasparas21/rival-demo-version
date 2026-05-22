import { afterEach, describe, expect, it } from "vitest";
import { readFacebookAdsMemoryMbytes } from "@/lib/apify/memory";

describe("readFacebookAdsMemoryMbytes", () => {
  const prevGlobal = process.env.APIFY_ACTOR_MEMORY_MBYTES;
  const prevMeta = process.env.META_ADS_MEMORY_MBYTES;

  afterEach(() => {
    if (prevGlobal === undefined) delete process.env.APIFY_ACTOR_MEMORY_MBYTES;
    else process.env.APIFY_ACTOR_MEMORY_MBYTES = prevGlobal;
    if (prevMeta === undefined) delete process.env.META_ADS_MEMORY_MBYTES;
    else process.env.META_ADS_MEMORY_MBYTES = prevMeta;
  });

  it("uses 512MB for a single Meta input URL even when global memory is 4GB", () => {
    process.env.APIFY_ACTOR_MEMORY_MBYTES = "4096";
    expect(readFacebookAdsMemoryMbytes(1)).toBe(512);
  });

  it("allows up to urlCount × 512MB", () => {
    process.env.APIFY_ACTOR_MEMORY_MBYTES = "4096";
    expect(readFacebookAdsMemoryMbytes(8)).toBe(4096);
  });
});
