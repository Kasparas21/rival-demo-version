import { describe, expect, it } from "vitest";

import { sidebarCompetitorToAccountPayload } from "../client";

describe("sidebarCompetitorToAccountPayload", () => {
  it("serializes adsLibraryContext passed directly on save payloads", () => {
    const payload = sidebarCompetitorToAccountPayload({
      slug: "adidas.com",
      name: "Adidas",
      adsLibraryContext: {
        ids: { meta: "123", google: "AR123" },
        channels: ["meta", "google", "pinterest", "snapchat"],
        confirmed: true,
      },
    });

    expect(payload.adsLibraryContext?.channels).toEqual(["meta", "google", "pinterest", "snapchat"]);
    expect(payload.adsLibraryContext?.ids?.tiktok).toBeUndefined();
  });

  it("falls back to libraryContext when adsLibraryContext is absent", () => {
    const payload = sidebarCompetitorToAccountPayload({
      slug: "adidas.com",
      name: "Adidas",
      libraryContext: {
        ids: { tiktok: "@brand" },
        channels: ["tiktok"],
        confirmed: true,
      },
    });

    expect(payload.adsLibraryContext?.channels).toEqual(["tiktok"]);
  });
});
