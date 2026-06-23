import { describe, expect, it } from "vitest";

import {
  googleCreativeDisplayUrl,
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
});
