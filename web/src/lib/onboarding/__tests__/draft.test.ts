import { describe, expect, it, beforeEach, vi } from "vitest";

import {
  ONBOARDING_DRAFT_STORAGE_KEY,
  clearOnboardingDraft,
  readOnboardingDraft,
  saveOnboardingDraft,
  type OnboardingDraft,
} from "@/lib/onboarding/draft";

const sampleDraft: OnboardingDraft = {
  v: 1,
  companyUrl: "nike.com",
  companyHost: "nike.com",
  workspaceChannels: ["meta"],
  workspaceAdMarketCodes: ["US"],
  workspaceMarketsGlobal: false,
  workspaceMarketsAuto: true,
  companyScrape: {
    websiteUrl: "https://nike.com",
    metaAdsLibraryUrl: "",
    googleAdsTransparencyUrl: "",
    linkedInAdLibraryUrl: "",
    tiktokAdsLibraryUrl: "",
    pinterestAdsCountry: "",
    snapchatAdsGalleryUrl: "",
  },
  brandInsights: {
    ok: true,
    domain: "nike.com",
    brandName: "Nike",
    description: null,
    logoUrl: null,
    contextSnippet: null,
    socials: [],
  },
};

describe("onboarding draft storage", () => {
  beforeEach(() => {
    const session = {
      store: new Map<string, string>(),
      getItem(key: string) {
        return this.store.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        this.store.set(key, value);
      },
      removeItem(key: string) {
        this.store.delete(key);
      },
    };
    vi.stubGlobal("sessionStorage", session);
    vi.stubGlobal("window", { sessionStorage: session });
    clearOnboardingDraft();
  });

  it("round-trips draft JSON in sessionStorage", () => {
    saveOnboardingDraft(sampleDraft);
    expect(readOnboardingDraft()).toEqual(sampleDraft);
  });

  it("clears draft", () => {
    saveOnboardingDraft(sampleDraft);
    clearOnboardingDraft();
    expect(readOnboardingDraft()).toBeNull();
    expect(sessionStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("rejects invalid stored shape", () => {
    sessionStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify({ v: 2 }));
    expect(readOnboardingDraft()).toBeNull();
  });
});
