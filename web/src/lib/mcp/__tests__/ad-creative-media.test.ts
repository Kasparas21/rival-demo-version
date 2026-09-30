import { describe, expect, it } from "vitest";

import { MCP_VISUALS_KEY, resolveMcpAdCreativeRefs, toFetchableHttpUrl } from "@/lib/mcp/ad-creative-media";
import { MCP_STRUCTURED_KEY, attachAdGallery } from "@/lib/mcp/ad-gallery-app";
import { signAdImageToken, verifyAdImageToken } from "@/lib/mcp/ad-image-token";
import { formatToolResult } from "@/lib/mcp/errors";

describe("toFetchableHttpUrl", () => {
  it("unwraps same-origin Google creative proxy paths to the original CDN url", () => {
    const original = "https://tpc.googlesyndication.com/simgad/123";
    expect(
      toFetchableHttpUrl(
        `/api/media/google-creative?url=${encodeURIComponent(original)}`,
        "https://spy-rival.com",
      ),
    ).toBe(original);
  });

  it("keeps https creative urls", () => {
    expect(toFetchableHttpUrl("https://cdn.example/ad.jpg")).toBe("https://cdn.example/ad.jpg");
  });

  it("rejects non-http urls", () => {
    expect(toFetchableHttpUrl("data:image/png;base64,abc")).toBeNull();
  });
});

describe("resolveMcpAdCreativeRefs", () => {
  it("prefers archived still for image ads", () => {
    const refs = resolveMcpAdCreativeRefs({
      id: "ad-1",
      platform: "meta",
      format: "image",
      ad_creative_url: "https://cdn.example/live.jpg",
      archived_creative_url: "https://storage.example/arch.jpg",
      raw_payload: { img: "https://cdn.example/live.jpg" },
    });
    expect(refs.visual_kind).toBe("image");
    expect(refs.image_url).toBe("https://storage.example/arch.jpg");
    expect(refs.video_url).toBeNull();
  });

  it("returns video url plus poster for video ads", () => {
    const refs = resolveMcpAdCreativeRefs({
      id: "ad-2",
      platform: "meta",
      format: "video",
      ad_creative_url: "https://cdn.example/poster.jpg",
      archived_creative_url: null,
      raw_payload: {
        img: "https://cdn.example/poster.jpg",
        videoUrl: "https://video.xx.fbcdn.net/v/ad.mp4",
        isVideo: true,
      },
    });
    expect(refs.visual_kind).toBe("video");
    expect(refs.video_url).toBe("https://video.xx.fbcdn.net/v/ad.mp4");
    expect(refs.image_url).toBe("https://cdn.example/poster.jpg");
  });
});

describe("ad image tokens", () => {
  it("round-trips a signed preview token", () => {
    process.env.SUPABASE_SECRET_KEY = "test-secret";
    const token = signAdImageToken("user-1", "ad-1", 1_700_000_000_000);
    expect(verifyAdImageToken(token, 1_700_000_000_000)).toMatchObject({
      u: "user-1",
      a: "ad-1",
    });
    expect(verifyAdImageToken(token, 1_700_000_000_000 + 7 * 60 * 60 * 1000)).toBeNull();
    expect(verifyAdImageToken(`${token}x`, 1_700_000_000_000)).toBeNull();
  });
});

describe("formatToolResult", () => {
  it("keeps json-only tool results as a single text block", () => {
    const result = formatToolResult({ ok: true, ads: [{ id: "1" }] });
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toEqual({
      type: "text",
      text: JSON.stringify({ ok: true, ads: [{ id: "1" }] }),
    });
  });

  it("appends image blocks and strips them from the json payload", () => {
    const result = formatToolResult({
      ok: true,
      ads: [{ id: "1" }],
      [MCP_VISUALS_KEY]: [{ type: "image", data: "abc123", mimeType: "image/jpeg" }],
    });
    expect(result.content).toHaveLength(2);
    expect(result.content[0]?.type).toBe("text");
    const parsed = JSON.parse((result.content[0] as { text: string }).text) as Record<string, unknown>;
    expect(parsed[MCP_VISUALS_KEY]).toBeUndefined();
    expect(parsed.ok).toBe(true);
    expect(result.content[1]).toMatchObject({
      type: "image",
      data: "abc123",
      mimeType: "image/jpeg",
    });
  });

  it("passes gallery structured content through and strips the private key", () => {
    const gallery = { title: "Ad creatives", ads: [{ id: "1", image_url: "https://spy-rival.com/api/mcp/ad-image?token=abc" }] };
    const result = formatToolResult({
      ok: true,
      gallery: gallery.ads,
      [MCP_STRUCTURED_KEY]: gallery,
    });
    expect(result.structuredContent).toEqual(gallery);
    const parsed = JSON.parse((result.content[0] as { text: string }).text) as Record<string, unknown>;
    expect(parsed[MCP_STRUCTURED_KEY]).toBeUndefined();
    expect(parsed.gallery).toEqual(gallery.ads);
  });

  it("gives the model vision pixels and the gallery the display jpeg", () => {
    const result = formatToolResult(
      attachAdGallery(
        { ok: true },
        [
          {
            id: "1",
            competitor: "Dental P.R.O.",
            caption: "Implantation",
            format: "image",
            image_data: "DISPLAY",
            vision_data: "VISION",
            mime: "image/jpeg",
          },
        ],
      ),
    );
    const ads = (result.structuredContent as { ads: Array<Record<string, unknown>> }).ads;
    expect(ads[0]?.image_data).toBe("DISPLAY");
    expect(ads[0]?.vision_data).toBeUndefined();
    expect(JSON.stringify(result.structuredContent)).not.toContain("VISION");
    expect(result.content[1]).toMatchObject({
      type: "image",
      data: "VISION",
      mimeType: "image/jpeg",
      annotations: { audience: ["assistant"] },
    });
    const parsed = JSON.parse((result.content[0] as { text: string }).text) as Record<string, unknown>;
    expect(parsed.creative_vision_count).toBe(1);
    expect(parsed[MCP_VISUALS_KEY]).toBeUndefined();
  });
});
