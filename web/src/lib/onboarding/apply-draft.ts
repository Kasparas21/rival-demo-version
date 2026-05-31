import { canonicalGoogleAdsTransparencyStartUrl } from "@/lib/ad-library/google-transparency-url";
import {
  DEFAULT_ONBOARDING_AD_MARKETS,
  inferAdMarketFromHostname,
  ONBOARDING_AD_MARKET_CODES,
} from "@/lib/onboarding/ad-markets";
import type { OnboardingDraft } from "@/lib/onboarding/draft";
import { hostToBrandLabel, isPlausiblePublicHostname } from "@/lib/onboarding/host";
import {
  adsProfileSetupV1,
  emptyWorkspaceScrapeRow,
  type AdsProfileSetup,
} from "@/lib/onboarding/workspace-ads-setup";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isMissingDbColumnError } from "@/lib/supabase/postgrest-schema-error";
import { validateIdentifierField } from "@/lib/validate-identifier-field";

function defaultWorkspaceAdMarketCodes(hostname: string): string[] {
  const inferred = inferAdMarketFromHostname(hostname);
  return inferred ? [inferred] : [...DEFAULT_ONBOARDING_AD_MARKETS];
}

export function effectiveMarketCodesFromDraft(draft: OnboardingDraft): string[] {
  if (draft.workspaceMarketsGlobal) return [...ONBOARDING_AD_MARKET_CODES];
  if (draft.workspaceMarketsAuto) return defaultWorkspaceAdMarketCodes(draft.companyHost);
  return draft.workspaceAdMarketCodes.length > 0 ? draft.workspaceAdMarketCodes : [...DEFAULT_ONBOARDING_AD_MARKETS];
}

type PersistSetupOptions = {
  userId: string;
  companyHost: string;
  primaryName: string;
  logoFromInsights: string | null;
  brandInsights: OnboardingDraft["brandInsights"];
  adsSetupJson: Record<string, unknown>;
  resolvedAdMarketCodes: string[];
  effectiveWorkspaceMarketCodes: string[];
  scrapeForPersist: AdsProfileSetup["scrape"];
  onboardingCompleted: boolean;
};

async function persistOnboardingSetup(options: PersistSetupOptions): Promise<{ ok: boolean; error?: string }> {
  const {
    userId,
    companyHost,
    primaryName,
    logoFromInsights,
    brandInsights,
    adsSetupJson,
    resolvedAdMarketCodes,
    effectiveWorkspaceMarketCodes,
    scrapeForPersist,
    onboardingCompleted,
  } = options;

  try {
    sessionStorage.setItem(
      `rival.onboarding_hints.v1.${userId}`,
      JSON.stringify({
        v: 4,
        ts: Date.now(),
        workspaceDomain: companyHost,
        workspace: {
          channels: (adsSetupJson.channels as string[]) ?? [],
          adMarketCountryCodes: [...effectiveWorkspaceMarketCodes].sort(),
          scrape: scrapeForPersist,
        },
        adMarketCountryCodes: resolvedAdMarketCodes,
        primarySocials: brandInsights?.socials ?? [],
        competitors: [],
      }),
    );
    if (resolvedAdMarketCodes.length > 0) {
      localStorage.setItem(
        "rival.ad_markets.v1",
        JSON.stringify({ codes: resolvedAdMarketCodes, updatedAt: Date.now() }),
      );
    }
  } catch {
    /* non-fatal */
  }

  const supabase = createSupabaseBrowserClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      company_name: primaryName,
      company_url: companyHost,
      onboarding_completed: onboardingCompleted,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  const logoUrlPatch =
    logoFromInsights && !logoFromInsights.includes("google.com/s2/favicons")
      ? ({ logo_url: logoFromInsights } as const)
      : {};

  const brandPatchBody = {
    name: primaryName,
    domain: companyHost,
    brand_context: brandInsights?.description?.trim() || null,
    ...logoUrlPatch,
    ads_profile_setup: adsSetupJson,
  };

  let brandRes = await fetch("/api/account/brands", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(brandPatchBody),
  });
  let brandJson = (await brandRes.json()) as { ok?: boolean; error?: string };

  if (
    !brandRes.ok &&
    typeof brandJson.error === "string" &&
    isMissingDbColumnError(brandJson.error, "ads_profile_setup")
  ) {
    const { ads_profile_setup: _drop, ...coreOnly } = brandPatchBody;
    brandRes = await fetch("/api/account/brands", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(coreOnly),
    });
    brandJson = (await brandRes.json()) as { ok?: boolean; error?: string };
  }

  if (!brandRes.ok || !brandJson.ok) {
    return {
      ok: false,
      error: typeof brandJson.error === "string" ? brandJson.error : "Could not save workspace brand.",
    };
  }

  const competitorPayload = [
    {
      slug: companyHost,
      name: primaryName,
      pending: false,
      brand: {
        name: primaryName,
        domain: companyHost,
        ...(logoFromInsights && !logoFromInsights.includes("google.com/s2/favicons")
          ? { logoUrl: logoFromInsights }
          : {}),
      },
      isWorkspaceBrand: true as const,
    },
  ];

  try {
    const res = await fetch("/api/account/saved-competitors", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competitors: competitorPayload }),
    });
    if (!res.ok) {
      const raw = await res.text();
      let msg = raw;
      try {
        const j = JSON.parse(raw) as { error?: string };
        if (typeof j?.error === "string") msg = j.error;
      } catch {
        /* keep */
      }
      return { ok: false, error: typeof msg === "string" ? msg : "Could not save competitors." };
    }
  } catch {
    return { ok: false, error: "Could not reach the server to save setup." };
  }

  return { ok: true };
}

/** After signup: company, brand, and platform choices only (before paywall). */
export async function applyPartialOnboardingDraft(
  userId: string,
  draft: OnboardingDraft,
): Promise<{ ok: boolean; error?: string }> {
  const companyHost = draft.companyHost;
  if (!isPlausiblePublicHostname(companyHost)) {
    return { ok: false, error: "Invalid company domain in saved setup." };
  }

  if (draft.workspaceChannels.length === 0) {
    return { ok: false, error: "No ad platforms selected." };
  }

  const workspaceChannels = draft.workspaceChannels;
  const brandInsights = draft.brandInsights;
  const primaryName =
    (brandInsights?.brandName?.trim() && brandInsights.brandName.trim()) || hostToBrandLabel(companyHost);
  const logoFromInsights = brandInsights?.logoUrl?.trim() || null;

  const siteHostNoWww = companyHost.replace(/^www\./i, "");
  const scrapeForPersist = {
    ...emptyWorkspaceScrapeRow(companyHost),
    websiteUrl: `https://${siteHostNoWww}`,
  };

  const adsSetupJson = adsProfileSetupV1({
    channels: workspaceChannels,
    adMarketCountryCodes: [],
    scrape: scrapeForPersist,
  });

  return persistOnboardingSetup({
    userId,
    companyHost,
    primaryName,
    logoFromInsights,
    brandInsights,
    adsSetupJson,
    resolvedAdMarketCodes: [],
    effectiveWorkspaceMarketCodes: [],
    scrapeForPersist,
    onboardingCompleted: false,
  });
}

/** Full onboarding completion (post-payment regions + ad profile URLs). */
export async function applyOnboardingDraft(
  userId: string,
  draft: OnboardingDraft,
): Promise<{ ok: boolean; error?: string }> {
  const companyHost = draft.companyHost;
  if (!isPlausiblePublicHostname(companyHost)) {
    return { ok: false, error: "Invalid company domain in saved setup." };
  }

  if (draft.workspaceChannels.length === 0) {
    return { ok: false, error: "No ad platforms selected." };
  }

  const workspaceChannels = draft.workspaceChannels;
  const effectiveWorkspaceMarketCodes = effectiveMarketCodesFromDraft(draft);
  const unionAdMarketCodes = [...new Set(effectiveWorkspaceMarketCodes)];
  if (unionAdMarketCodes.length === 0) {
    unionAdMarketCodes.push(...DEFAULT_ONBOARDING_AD_MARKETS);
  }

  if (workspaceChannels.includes("google")) {
    const gv = draft.companyScrape.googleAdsTransparencyUrl.trim();
    if (!gv) {
      return { ok: false, error: "Missing Google Ads Transparency URL." };
    }
    const gre = validateIdentifierField("google", gv);
    if (!gre.valid && "error" in gre) {
      return { ok: false, error: gre.error };
    }
  }

  const brandInsights = draft.brandInsights;
  const primaryName =
    (brandInsights?.brandName?.trim() && brandInsights.brandName.trim()) || hostToBrandLabel(companyHost);
  const logoFromInsights = brandInsights?.logoUrl?.trim() || null;

  const siteHostNoWww = companyHost.replace(/^www\./i, "");
  let scrapePersist = draft.companyScrape;
  const gtCanon =
    workspaceChannels.includes("google") && draft.companyScrape.googleAdsTransparencyUrl.trim()
      ? canonicalGoogleAdsTransparencyStartUrl(draft.companyScrape.googleAdsTransparencyUrl.trim())
      : null;
  if (gtCanon && gtCanon !== draft.companyScrape.googleAdsTransparencyUrl.trim()) {
    scrapePersist = { ...draft.companyScrape, googleAdsTransparencyUrl: gtCanon };
  }

  const scrapeForPersist = {
    ...scrapePersist,
    websiteUrl: `https://${siteHostNoWww}`,
  };

  const adsSetupJson = adsProfileSetupV1({
    channels: workspaceChannels,
    adMarketCountryCodes: [...effectiveWorkspaceMarketCodes].sort(),
    scrape: scrapeForPersist,
  });

  const resolvedAdMarketCodes = [...unionAdMarketCodes].sort();

  return persistOnboardingSetup({
    userId,
    companyHost,
    primaryName,
    logoFromInsights,
    brandInsights,
    adsSetupJson,
    resolvedAdMarketCodes,
    effectiveWorkspaceMarketCodes,
    scrapeForPersist,
    onboardingCompleted: true,
  });
}
