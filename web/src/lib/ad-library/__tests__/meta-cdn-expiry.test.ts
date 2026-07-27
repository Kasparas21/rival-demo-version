import { describe, expect, it } from "vitest";

import { isExpiredMetaCdnUrl, metaCdnUrlExpiryMs } from "@/lib/ad-library/meta-cdn-expiry";

describe("meta-cdn-expiry", () => {
  const base = "https://scontent.fhex1-1.fna.fbcdn.net/v/t39.35426-6/photo.jpg?_nc_cat=100";

  it("parses hex oe param into ms", () => {
    // 0x68000000 = 1744830464s
    expect(metaCdnUrlExpiryMs(`${base}&oe=68000000`)).toBe(1744830464 * 1000);
  });

  it("returns null for non-fbcdn URLs", () => {
    expect(metaCdnUrlExpiryMs("https://cdn.example.com/a.jpg?oe=68000000")).toBeNull();
  });

  it("returns null when oe missing or malformed", () => {
    expect(metaCdnUrlExpiryMs(base)).toBeNull();
    expect(metaCdnUrlExpiryMs(`${base}&oe=`)).toBeNull();
    expect(metaCdnUrlExpiryMs("")).toBeNull();
  });

  it("flags expired URLs relative to now", () => {
    const now = 1750000000 * 1000;
    expect(isExpiredMetaCdnUrl(`${base}&oe=68000000`, now)).toBe(true); // past
    expect(isExpiredMetaCdnUrl(`${base}&oe=6a000000`, now)).toBe(false); // future (0x6a000000 > now)
  });
});
