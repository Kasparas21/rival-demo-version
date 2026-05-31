import { describe, expect, it, vi, beforeEach } from "vitest";

import type { OnboardingDraft } from "@/lib/onboarding/draft";

const profileUpdate = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({
    from: (table: string) => {
      if (table === "profiles") {
        return {
          update: (payload: unknown) => {
            profileUpdate(payload);
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      }
      return fromMock(table);
    },
  }),
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { applyPartialOnboardingDraft } from "@/lib/onboarding/apply-draft";

const baseDraft: OnboardingDraft = {
  v: 1,
  companyUrl: "nike.com",
  companyHost: "nike.com",
  workspaceChannels: ["meta", "google"],
  workspaceAdMarketCodes: [],
  workspaceMarketsGlobal: false,
  workspaceMarketsAuto: true,
  companyScrape: {
    websiteUrl: "",
    metaAdsLibraryUrl: "",
    googleAdsTransparencyUrl: "",
    googleAdsDomain: "",
    linkedInUrl: "",
    tiktokKeyword: "",
    pinterestKeyword: "",
    snapchatKeyword: "",
    facebookUrl: "",
    instagramUrl: "",
    tikTokUrl: "",
    youTubeUrl: "",
  },
  brandInsights: null,
};

describe("applyPartialOnboardingDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileUpdate.mockClear();
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/api/account/brands")) {
        return { ok: true, json: async () => ({ ok: true }) };
      }
      if (url.includes("/api/account/saved-competitors")) {
        return { ok: true, json: async () => ({ ok: true }) };
      }
      return { ok: false, json: async () => ({ ok: false }) };
    });
    vi.stubGlobal("sessionStorage", {
      setItem: vi.fn(),
      getItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal("localStorage", {
      setItem: vi.fn(),
      getItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it("saves profile without completing onboarding and without requiring Google URL", async () => {
    const result = await applyPartialOnboardingDraft("user-1", baseDraft);
    expect(result.ok).toBe(true);
    expect(profileUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        company_url: "nike.com",
        onboarding_completed: false,
      }),
    );
  });
});
