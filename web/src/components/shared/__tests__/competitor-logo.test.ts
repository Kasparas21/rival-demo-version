import { describe, expect, it } from "vitest";

import { buildLogoCandidates } from "@/components/shared/competitor-logo";

describe("buildLogoCandidates", () => {
  it("returns empty when no usable sources", () => {
    expect(buildLogoCandidates({})).toEqual([]);
    expect(buildLogoCandidates({ primary: "", secondary: null, domain: "" })).toEqual([]);
  });

  it("places primary first then secondary", () => {
    const urls = buildLogoCandidates({
      primary: "https://a.test/a.png",
      secondary: "https://b.test/b.png",
    });
    expect(urls[0]).toBe("https://a.test/a.png");
    expect(urls[1]).toBe("https://b.test/b.png");
  });

  it("deduplicates when primary equals secondary", () => {
    const u = "https://same.test/x.png";
    const urls = buildLogoCandidates({ primary: u, secondary: u });
    expect(urls.filter((x) => x === u).length).toBe(1);
  });

  it("strips protocol and www from domain and appends synthetics", () => {
    const urls = buildLogoCandidates({
      primary: null,
      domain: "https://www.example.co.uk/path",
    });
    expect(urls.some((x) => x.includes("logo.clearbit.com"))).toBe(true);
    expect(urls.some((x) => x.includes("google.com/s2/favicons"))).toBe(true);
    expect(urls.some((x) => x.includes("duckduckgo.com"))).toBe(true);
  });

  it("skips synthetics for non-domain strings", () => {
    expect(buildLogoCandidates({ domain: "not-a-host" })).toEqual([]);
  });
});
