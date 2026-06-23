import { describe, expect, it } from "vitest";

import type { OnboardingDraft } from "@/lib/onboarding/draft";
import { resolveOnboardingCompanyHost } from "@/lib/onboarding/resolve-company-host";

const draft: OnboardingDraft = {
  v: 1,
  companyUrl: "acme.com",
  companyHost: "acme.com",
  workspaceChannels: ["meta"],
  workspaceAdMarketCodes: [],
  workspaceMarketsGlobal: false,
  workspaceMarketsAuto: true,
  companyScrape: {
    websiteUrl: "https://acme.com",
    metaAdsLibraryUrl: "",
    googleAdsTransparencyUrl: "",
    linkedInAdLibraryUrl: "",
    tiktokAdsLibraryUrl: "",
    pinterestAdsCountry: "",
    snapchatAdsGalleryUrl: "",
  },
  brandInsights: null,
};

describe("resolveOnboardingCompanyHost", () => {
  it("prefers live company input when valid", () => {
    expect(
      resolveOnboardingCompanyHost({
        companyUrl: "live.io",
        profileCompanyUrl: "profile.com",
        draft,
      }),
    ).toBe("live.io");
  });

  it("falls back to guest draft after Google signup", () => {
    expect(
      resolveOnboardingCompanyHost({
        companyUrl: "",
        profileCompanyUrl: null,
        draft,
      }),
    ).toBe("acme.com");
  });

  it("falls back to profile company_url when draft is missing", () => {
    expect(
      resolveOnboardingCompanyHost({
        companyUrl: "",
        profileCompanyUrl: "https://www.saved.co.uk",
        draft: null,
      }),
    ).toBe("saved.co.uk");
  });
});
