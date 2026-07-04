import { describe, expect, it } from "vitest";

import {
  buildGoogleStillPreviewDisplayCandidates,
  googleCreativeDisplayUrl,
  resolveGoogleStillPreviewDisplayCandidates,
  resolveGoogleStillPreviewDisplayUrl,
} from "@/lib/ad-library/google-creative-display-url";

describe("googleCreativeDisplayUrl", () => {
  it("proxies googlesyndication simgad URLs", () => {
    const external = "https://tpc.googlesyndication.com/archive/simgad/9471784302321938955";
    expect(googleCreativeDisplayUrl(external)).toBe(
      `/api/media/google-creative?url=${encodeURIComponent(external)}`,
    );
  });

  it("leaves non-Google hosts unchanged", () => {
    const external = "https://cdn.example.com/ad.jpg";
    expect(googleCreativeDisplayUrl(external)).toBe(external);
  });

  it("resolves previewUrl before img for card display", () => {
    const display = resolveGoogleStillPreviewDisplayUrl(
      "https://tpc.googlesyndication.com/archive/simgad/9471784302321938955",
      null,
    );
    expect(display).toContain("/api/media/google-creative?url=");
  });

  it("falls back to direct CDN when building display candidates", () => {
    const external = "https://tpc.googlesyndication.com/archive/simgad/9471784302321938955";
    const candidates = buildGoogleStillPreviewDisplayCandidates(external);
    expect(candidates[0]).toContain("/api/media/google-creative?url=");
    expect(candidates[candidates.length - 1]).toBe(external);
  });

  it("skips content.js preview loaders and uses simgad imageUrl", () => {
    const candidates = resolveGoogleStillPreviewDisplayCandidates(
      "https://displayads-formats.googleusercontent.com/ads/preview/content.js?creativeId=CR1",
      "https://tpc.googlesyndication.com/archive/simgad/123",
    );
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.join(" ")).toContain("simgad/123");
    expect(candidates.join(" ")).not.toContain("content.js");
  });
});
