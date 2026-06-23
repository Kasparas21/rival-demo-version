import { describe, expect, it } from "vitest";

import {
  googleItemToRow,
  isUsableGoogleStillImagePreviewUrl,
  normalizeGoogleApiItem,
} from "@/lib/ad-library/normalize";

describe("Google TEXT simgad previews from Apify", () => {
  it("maps simgad previewUrl onto google row img for TEXT ads", () => {
    const raw = {
      status: "Success",
      advertiserId: "AR18365585272172707841",
      advertiserName: "Skims Body Inc",
      creativeId: "CR09667462223512993793",
      adFormat: "TEXT",
      firstShown: "2025-07-09",
      lastShown: "2026-06-23",
      previewUrl: "https://tpc.googlesyndication.com/archive/simgad/9471784302321938955",
      imageUrl: "https://tpc.googlesyndication.com/archive/simgad/9471784302321938955",
      creativeUrl:
        "https://adstransparency.google.com/advertiser/AR18365585272172707841/creative/CR09667462223512993793",
      headline: null,
      description: null,
    };

    const item = normalizeGoogleApiItem(raw);
    expect(item.previewUrl).toContain("googlesyndication.com/archive/simgad/");
    const row = googleItemToRow(item, 0, { queryDomain: "skims.com" });
    expect(row.type).toBe("google");
    if (row.type !== "google") return;

    expect(row.img).toContain("googlesyndication.com/archive/simgad/");
    expect(row.previewUrl).toContain("googlesyndication.com/archive/simgad/");

    const imageSrc =
      (isUsableGoogleStillImagePreviewUrl(row.previewUrl?.trim() || "") ? row.previewUrl!.trim() : "") ||
      (isUsableGoogleStillImagePreviewUrl(row.img || "") ? row.img! : "");
    expect(imageSrc).toContain("simgad/");
  });
});
