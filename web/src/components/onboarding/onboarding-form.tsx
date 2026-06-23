"use client";

import { Building2, Check, ExternalLink } from "lucide-react";
import {
  GoogleLogo,
  LinkedInLogo,
  MetaLogo,
  PinterestLogo,
  SnapchatLogo,
  TikTokLogo,
} from "@/components/platform-logos";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { glassInputClass } from "@/components/ui/glass-styles";
import { RivalLoadingBlock } from "@/components/ui/rival-loading";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isMissingDbColumnError } from "@/lib/supabase/postgrest-schema-error";
import {
  hostToBrandLabel,
  isPlausiblePublicHostname,
  MAX_COMPANY_INPUT_CHARS,
  normalizedWorkspaceHost,
  sanitizeCompanyUrlInput,
} from "@/lib/onboarding/host";
import {
  countryFlagEmoji,
  DEFAULT_ONBOARDING_AD_MARKETS,
  inferAdMarketFromHostname,
  ONBOARDING_AD_MARKETS,
  ONBOARDING_AD_MARKET_CODES,
} from "@/lib/onboarding/ad-markets";
import { validateIdentifierField } from "@/lib/validate-identifier-field";
import {
  canonicalLinkedInAdLibraryUrl,
  canonicalMetaAdsLibraryUrl,
} from "@/lib/ad-library/canonical-library-url";
import { canonicalGoogleAdsTransparencyStartUrl } from "@/lib/ad-library/google-transparency-url";
import {
  buildGoogleTransparencyPreviewUrl,
  buildLinkedInAdLibraryPreviewUrl,
  buildMetaAdsLibraryPreviewUrl,
  buildPinterestAdsPreviewUrl,
  buildSnapchatAdsGalleryPreviewUrl,
  buildTikTokAdsLibraryPreviewUrl,
} from "@/lib/onboarding/ad-library-preview-urls";
import { OnboardingCardLocaleSwitcher } from "@/components/onboarding/onboarding-card-locale-switcher";
import { OnboardingProgressBar } from "@/components/onboarding/onboarding-progress-bar";
import type { Locale } from "@/lib/i18n/locale";
import { buildSignupAfterOnboardingPath } from "@/lib/auth/trial-flow";
import { PlanPickerContent } from "@/components/billing/plan-picker-content";
import { CHANNELS, type ChannelId } from "@/components/channel-picker-modal";
import { saveOnboardingDraft, readOnboardingDraft, clearOnboardingDraft, type OnboardingDraft } from "@/lib/onboarding/draft";
import { resolveOnboardingCompanyHost } from "@/lib/onboarding/resolve-company-host";
import {
  adsProfileSetupV1,
  emptyWorkspaceScrapeRow,
  mergeWorkspaceScrapeFromSocials,
  type AdsProfileSetup,
  type WorkspaceAdsScrapeHints,
} from "@/lib/onboarding/workspace-ads-setup";
import { buildWorkspaceBrandScrapeHref } from "@/lib/ad-library/workspace-brand-initial-scrape";
import { fillCopyTemplate } from "@/lib/i18n/fill-copy-template";
import type { OnboardingCopy } from "@/lib/i18n/onboarding/types";

/** Workspace ad-profile step (2-column grid): label + input only */
const workspaceAdProfileInputClass = `${glassInputClass} rounded-xl px-3 py-2.5 text-[14px]`;
const workspaceAdProfileCellClass =
  "rounded-xl border border-gray-200/60 bg-white/40 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-sm";
const workspaceAdProfileOpenLinkClass =
  "inline-flex shrink-0 items-center justify-center rounded-md p-1 text-gray-500 transition hover:bg-white/70 hover:text-[#1e6fa8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e6fa8]/25";

function WorkspaceAdProfileField({
  Logo,
  label,
  value,
  placeholder,
  previewHref,
  onChange,
  onBlur,
  error,
  warning,
  inputClassName,
  openAdsLibraryTitle,
  openAdsLibrarySrOnly,
}: {
  Logo: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  placeholder: string;
  previewHref: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  warning?: string | null;
  inputClassName?: string;
  openAdsLibraryTitle: string;
  openAdsLibrarySrOnly: string;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Logo className="size-5 shrink-0 sm:size-6" />
          <span className="text-[14px] font-semibold text-gray-900 sm:text-[15px]">{label}</span>
        </div>
        <a
          href={previewHref}
          target="_blank"
          rel="noopener noreferrer"
          title={openAdsLibraryTitle}
          className={workspaceAdProfileOpenLinkClass}
        >
          <ExternalLink className="size-3.5 opacity-80" strokeWidth={2} aria-hidden />
          <span className="sr-only">{openAdsLibrarySrOnly}</span>
        </a>
      </div>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`${workspaceAdProfileInputClass} w-full ${inputClassName ?? ""}`}
      />
      {error ? <p className="text-[12px] font-semibold leading-snug text-red-700">{error}</p> : null}
      {warning ? <p className="text-[12px] font-semibold leading-snug text-amber-900/90">{warning}</p> : null}
    </div>
  );
}

/** step indices */
const STEP_WEBSITE = 0;
const STEP_BRAND = 1;
const STEP_WORKSPACE_CHANNELS = 2;
const STEP_WORKSPACE_MARKETS = 3;
const STEP_WORKSPACE_SCRAPE = 4;
const STEP_CHOOSE_PLAN = 5;

const ALL_WORKSPACE_CHANNEL_IDS: ChannelId[] = CHANNELS.map((c) => c.id);

function getHydrationDraft(): OnboardingDraft | null {
  if (typeof window === "undefined") return null;
  return readOnboardingDraft();
}

function isAllWorkspaceChannels(channels: ChannelId[]): boolean {
  return (
    channels.length === ALL_WORKSPACE_CHANNEL_IDS.length &&
    ALL_WORKSPACE_CHANNEL_IDS.every((id) => channels.includes(id))
  );
}

function resolveInitialWorkspaceChannels(
  initialBrandSetup: AdsProfileSetup | null | undefined,
): ChannelId[] {
  if (initialBrandSetup?.channels?.length) return initialBrandSetup.channels;
  if (typeof window !== "undefined") {
    const draft = readOnboardingDraft();
    if (draft?.workspaceChannels?.length) return draft.workspaceChannels;
  }
  return ALL_WORKSPACE_CHANNEL_IDS;
}

function defaultWorkspaceAdMarketCodes(hostname: string): string[] {
  const inferred = inferAdMarketFromHostname(hostname);
  return inferred ? [inferred] : [...DEFAULT_ONBOARDING_AD_MARKETS];
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function faviconUrlForDomain(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

/** keyed by src so load/error state resets per domain without effects */
function DebouncedCompanyFavicon({ src, loadingLabel }: { src: string; loadingLabel: string }) {
  const [phase, setPhase] = useState<"loading" | "loaded" | "error">("loading");

  return (
    <>
      {phase === "loading" ? (
        <div
          className="absolute inset-0 z-[1] animate-pulse bg-gradient-to-br from-gray-200/95 to-gray-300/75"
          role="status"
          aria-label={loadingLabel}
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className={`relative z-[1] size-full object-cover transition-opacity duration-300 ease-out ${
          phase === "loaded" ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setPhase("loaded")}
        onError={() => setPhase("error")}
      />
      {phase === "error" ? (
        <div className="absolute inset-0 z-[2] flex items-center justify-center bg-gray-100/95">
          <Building2 className="size-5 text-gray-400" aria-hidden strokeWidth={1.5} />
        </div>
      ) : null}
    </>
  );
}

function DomainFavicon({
  domain,
  className,
  loadingLabel,
}: {
  domain: string;
  className?: string;
  loadingLabel: string;
}) {
  const src = faviconUrlForDomain(domain);
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg border border-white/50 bg-white/40 shadow-sm ${className ?? "size-9"}`}
    >
      <DebouncedCompanyFavicon src={src} loadingLabel={loadingLabel} />
    </div>
  );
}

function adMarketSummariesForCodes(codes: string[]): { code: string; shortTag: string }[] {
  const set = new Set(codes);
  return ONBOARDING_AD_MARKETS.filter((m) => set.has(m.code)).map((m) => ({ code: m.code, shortTag: m.shortTag }));
}

function MarketCodesSummary({ codes, noneLabel }: { codes: string[]; noneLabel: string }) {
  const items = adMarketSummariesForCodes(codes);
  if (items.length === 0)
    return <span className="text-[10px] font-semibold text-amber-900/85">{noneLabel}</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {items.map((m) => (
        <span
          key={m.code}
          className="inline-flex items-center gap-0.5 rounded border border-gray-200/90 bg-white/95 px-1 py-0.5 text-[10px] font-bold text-gray-800"
        >
          <span className="text-[0.7rem] leading-none" aria-hidden>
            {countryFlagEmoji(m.code)}
          </span>
          {m.shortTag}
        </span>
      ))}
    </span>
  );
}

function AdMarketChips({
  selectedCodes,
  onToggle,
  leadingSlot,
  ariaLabel,
}: {
  selectedCodes: string[];
  onToggle: (code: string) => void;
  leadingSlot?: ReactNode;
  ariaLabel: string;
}) {
  return (
    <div className="relative -mx-1">
      <div
        className="flex max-w-full flex-nowrap gap-1 overflow-x-auto overscroll-x-contain scroll-smooth rounded-lg border border-gray-200/70 bg-white/40 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label={ariaLabel}
      >
        {leadingSlot ? <span className="inline-flex shrink-0 snap-start items-center">{leadingSlot}</span> : null}
        {ONBOARDING_AD_MARKETS.map((m) => {
          const on = selectedCodes.includes(m.code);
          return (
            <button
              key={m.code}
              type="button"
              aria-pressed={on}
              title={m.label}
              onClick={() => onToggle(m.code)}
              className={`inline-flex shrink-0 snap-start items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide transition ${
                on
                  ? "border-gray-900/40 bg-gray-900 text-white shadow-sm"
                  : "border-gray-200/80 bg-white/35 text-gray-600 backdrop-blur-sm hover:bg-white/55 hover:text-gray-900"
              }`}
            >
              <span className="text-[0.85rem] leading-none" aria-hidden>
                {countryFlagEmoji(m.code)}
              </span>
              {m.shortTag}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Props = {
  copy: OnboardingCopy;
  locale: Locale;
  userId: string;
  postOnboardingPath?: string;
  /** @deprecated Trial funnel uses /choose-plan after onboarding; kept for dev replay. */
  showPlanStep?: boolean;
  guestMode?: boolean;
  /** Website + brand + platforms only (before paywall). Guest mode implies this. */
  prePaymentOnly?: boolean;
  /** Resume at regions (step 3) after payment — skips website / brand / platforms. */
  postPaymentResume?: boolean;
  initialStep?: number;
  initialBrandSetup?: AdsProfileSetup | null;
  initialDomain?: string | null;
  testerInviteActive?: boolean;
  /** Valid invite code from URL/cookie for signup redirect attribution. */
  testerInviteCode?: string | null;
  initialData?: {
    company_name?: string | null;
    company_url?: string | null;
  } | null;
};

type BrandInsightsPayload = {
  ok: boolean;
  partial?: boolean;
  domain: string;
  brandName: string;
  description: string | null;
  logoUrl: string | null;
  contextSnippet: string | null;
  socials: { label: string; href: string; handle: string }[];
  message?: string;
};

function brandInsightsFromDraft(draft: OnboardingDraft): BrandInsightsPayload | null {
  if (!draft.brandInsights) return null;
  return {
    ok: draft.brandInsights.ok,
    partial: draft.brandInsights.partial,
    domain: draft.brandInsights.domain,
    brandName: draft.brandInsights.brandName,
    description: draft.brandInsights.description,
    logoUrl: draft.brandInsights.logoUrl,
    contextSnippet: draft.brandInsights.contextSnippet,
    socials: draft.brandInsights.socials,
  };
}

export function OnboardingForm({
  copy,
  locale,
  userId,
  postOnboardingPath = "/dashboard/spy",
  showPlanStep = false,
  guestMode = false,
  prePaymentOnly = false,
  postPaymentResume = false,
  initialStep,
  initialBrandSetup = null,
  initialDomain = null,
  testerInviteActive = false,
  testerInviteCode = null,
  initialData = null,
}: Props) {
  const router = useRouter();
  const t = copy.form;
  const openLinkFor = (label: string) => ({
    openAdsLibraryTitle: fillCopyTemplate(t.openAdsLibraryTitle, { label }),
    openAdsLibrarySrOnly: fillCopyTemplate(t.openAdsLibrarySrOnly, { label }),
  });
  const compactPrePaymentFlow = guestMode || prePaymentOnly;
  const [step, setStep] = useState(() => {
    if (postPaymentResume) return STEP_WORKSPACE_MARKETS;
    if (initialStep != null) return initialStep;
    return STEP_WEBSITE;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finishInFlightRef = useRef(false);
  /** Last website host seen when advancing from step 0 — invalidates caches when edited */
  const lastContinueFromWebsiteHostRef = useRef<string>("");

  const [companyUrl, setCompanyUrl] = useState(() => {
    const draft = getHydrationDraft();
    if (draft?.companyUrl?.trim()) return sanitizeCompanyUrlInput(draft.companyUrl);
    if (initialDomain) return sanitizeCompanyUrlInput(initialDomain);
    return sanitizeCompanyUrlInput(initialData?.company_url ?? "");
  });

  const [brandLoading, setBrandLoading] = useState(false);
  const [brandInsights, setBrandInsights] = useState<BrandInsightsPayload | null>(() => {
    const draft = getHydrationDraft();
    return draft ? brandInsightsFromDraft(draft) : null;
  });

  /** Workspace (your ads) */
  const [workspaceChannels, setWorkspaceChannels] = useState<ChannelId[]>(() =>
    resolveInitialWorkspaceChannels(initialBrandSetup),
  );
  const [workspaceAdMarketCodes, setWorkspaceAdMarketCodes] = useState<string[]>([]);
  /** When true, all supported ISO markets apply (exclusive with manual country picks). */
  const [workspaceMarketsGlobal, setWorkspaceMarketsGlobal] = useState(false);
  /**
   * When true, workspace regions use `defaultWorkspaceAdMarketCodes` (domain inference, else US) —
   * compact step UI shows "Auto" until the user opens the picker.
   */
  const [workspaceMarketsAuto, setWorkspaceMarketsAuto] = useState(true);
  const [workspaceMarketsPickerExpanded, setWorkspaceMarketsPickerExpanded] = useState(false);
  const [companyScrape, setCompanyScrape] = useState<WorkspaceAdsScrapeHints>(() => {
    const draft = getHydrationDraft();
    const hostFromDraft = draft?.companyHost
      ? normalizedWorkspaceHost(draft.companyHost)
      : "";
    const host =
      hostFromDraft ||
      (initialDomain
        ? normalizedWorkspaceHost(sanitizeCompanyUrlInput(initialDomain))
        : normalizedWorkspaceHost(sanitizeCompanyUrlInput(initialData?.company_url ?? "")));
    const base = emptyWorkspaceScrapeRow(host);
    if (!initialBrandSetup?.scrape) return base;
    return { ...base, ...initialBrandSetup.scrape };
  });
  const workspaceSocialMergedSigRef = useRef("");
  const brandSetupHydratedRef = useRef(false);

  const normalizedCompany = useMemo(() => normalizedWorkspaceHost(companyUrl.trim()), [companyUrl]);

  useEffect(() => {
    const draft = readOnboardingDraft();
    if (!draft) return;
    if (!companyUrl.trim() && draft.companyUrl?.trim()) {
      setCompanyUrl(sanitizeCompanyUrlInput(draft.companyUrl));
    }
    if (!brandInsights && draft.brandInsights) {
      setBrandInsights(brandInsightsFromDraft(draft));
    }
    // Hydrate once on mount — guest draft survives Google OAuth redirect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialBrandSetup || brandSetupHydratedRef.current) return;
    brandSetupHydratedRef.current = true;
    if (initialBrandSetup.channels.length > 0) {
      setWorkspaceChannels(initialBrandSetup.channels);
    }
    const codes = initialBrandSetup.adMarketCountryCodes;
    if (codes.length >= ONBOARDING_AD_MARKET_CODES.length) {
      setWorkspaceMarketsGlobal(true);
      setWorkspaceMarketsAuto(false);
      setWorkspaceAdMarketCodes([]);
    } else if (codes.length > 0) {
      setWorkspaceMarketsGlobal(false);
      setWorkspaceMarketsAuto(false);
      setWorkspaceAdMarketCodes([...codes]);
    }
    setCompanyScrape((prev) => ({
      ...emptyWorkspaceScrapeRow(normalizedCompany),
      ...prev,
      ...initialBrandSetup.scrape,
    }));
  }, [initialBrandSetup, normalizedCompany]);

  /** Post-signup: restore platform picks from guest draft until DB sync catches up. */
  useEffect(() => {
    if (initialBrandSetup?.channels?.length) return;
    const draft = readOnboardingDraft();
    if (!draft?.workspaceChannels?.length) return;
    setWorkspaceChannels((prev) =>
      isAllWorkspaceChannels(prev) ? draft.workspaceChannels : prev,
    );
  }, [initialBrandSetup, postPaymentResume]);

  const effectiveWorkspaceMarketCodes = useMemo(() => {
    if (workspaceMarketsGlobal) return [...ONBOARDING_AD_MARKET_CODES];
    if (workspaceMarketsAuto) return defaultWorkspaceAdMarketCodes(normalizedCompany);
    return workspaceAdMarketCodes;
  }, [workspaceMarketsGlobal, workspaceMarketsAuto, workspaceAdMarketCodes, normalizedCompany]);

  const unionAdMarketCodes = useMemo(() => {
    const u = new Set<string>();
    for (const c of effectiveWorkspaceMarketCodes) u.add(c);
    if (u.size === 0) return [...DEFAULT_ONBOARDING_AD_MARKETS];
    return [...u];
  }, [effectiveWorkspaceMarketCodes]);
  const faviconEligible = normalizedCompany.includes(".") && normalizedCompany.length <= 253;
  const debouncedCompanyHost = useDebounced(normalizedCompany, 450);
  const debouncedEligibleForFavicon =
    debouncedCompanyHost.includes(".") && isPlausiblePublicHostname(debouncedCompanyHost);
  const faviconSrc = debouncedEligibleForFavicon ? faviconUrlForDomain(debouncedCompanyHost) : null;

  const typingFaviconLag =
    faviconEligible &&
    normalizedCompany !== debouncedCompanyHost &&
    companyUrl.trim().length > 0;
  const showTypingSkeleton = typingFaviconLag;
  const showFaviconSlot = showTypingSkeleton || Boolean(faviconSrc);
  const companyLooksValid = isPlausiblePublicHostname(normalizedCompany);
  const toggleWorkspaceChannel = useCallback((id: ChannelId) => {
    setWorkspaceChannels((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const toggleWorkspaceCountryMarket = useCallback((code: string) => {
    setWorkspaceMarketsAuto(false);
    setWorkspaceMarketsGlobal(false);
    setWorkspaceAdMarketCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }, []);

  const workspaceMetaInputError = useMemo(() => {
    const v = companyScrape.metaAdsLibraryUrl.trim();
    if (!v) return null;
    const r = validateIdentifierField("meta", v, t.validation);
    return r.valid || !("error" in r) ? null : r.error;
  }, [companyScrape.metaAdsLibraryUrl, t.validation]);

  const workspaceGoogleInputError = useMemo(() => {
    const v = companyScrape.googleAdsTransparencyUrl.trim();
    if (!v) return null;
    const r = validateIdentifierField("google", v, t.validation);
    return r.valid || !("error" in r) ? null : r.error;
  }, [companyScrape.googleAdsTransparencyUrl, t.validation]);

  const workspaceLinkedInWarning = useMemo(() => {
    const v = companyScrape.linkedInUrl.trim();
    if (!v) return null;
    const r = validateIdentifierField("linkedin", v, t.validation);
    return r.valid || !("warning" in r) ? null : r.warning;
  }, [companyScrape.linkedInUrl, t.validation]);

  const patchCompanyScrape = useCallback((patch: Partial<WorkspaceAdsScrapeHints>) => {
    setCompanyScrape((prev) => ({
      ...emptyWorkspaceScrapeRow(normalizedCompany),
      ...prev,
      ...patch,
    }));
  }, [normalizedCompany]);

  const workspaceChannelsValid = workspaceChannels.length > 0;
  const workspaceMarketsComplete =
    workspaceChannels.length === 0 ||
    workspaceMarketsGlobal ||
    workspaceAdMarketCodes.length > 0 ||
    workspaceMarketsAuto;
  const workspaceChannelSet = useMemo(() => new Set(workspaceChannels), [workspaceChannels]);
  const singleWorkspaceAdProfile = workspaceChannels.length === 1;

  const handleCompanyChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setCompanyUrl(sanitizeCompanyUrlInput(e.target.value));
  }, []);

  useEffect(() => {
    if (step !== STEP_WORKSPACE_SCRAPE) return;

    const socials = brandInsights?.socials ?? [];
    const sig = socials.map((s) => s.href).sort().join("|");
    const mergeSocialLinks = sig !== workspaceSocialMergedSigRef.current;
    if (mergeSocialLinks) {
      workspaceSocialMergedSigRef.current = sig;
    }

    setCompanyScrape((prev) =>
      mergeSocialLinks
        ? mergeWorkspaceScrapeFromSocials(normalizedCompany, prev, socials)
        : prev,
    );
  }, [step, normalizedCompany, brandInsights]);

  /** Step 1: Firecrawl-backed brand enrichment (skipped when cache matches workspace host) */
  useEffect(() => {
    if (step !== 1) return;
    if (!isPlausiblePublicHostname(normalizedCompany)) return;

    const cacheOk =
      !!brandInsights &&
      normalizedWorkspaceHost(String(brandInsights.domain ?? "")) === normalizedCompany &&
      typeof brandInsights.brandName === "string";

    if (cacheOk) return;

    const ac = new AbortController();

    async function load() {
      setBrandLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/onboarding/brand-insights", {
          method: "POST",
          credentials: guestMode ? "omit" : "include",
          headers: {
            "Content-Type": "application/json",
            ...(guestMode ? { "x-rival-guest-onboarding": "1" } : {}),
          },
          body: JSON.stringify({ domain: normalizedCompany }),
          signal: ac.signal,
        });
        const data = (await res.json()) as BrandInsightsPayload & { error?: string };
        if (!res.ok || !data.ok) {
          if (!ac.signal.aborted) {
            setBrandInsights(null);
            setError(typeof data.error === "string" ? data.error : t.errors.brandPreviewFailed);
          }
          return;
        }
        if (!ac.signal.aborted) setBrandInsights(data);
      } catch {
        if (!ac.signal.aborted)
          setError(t.errors.networkBrandScan);
      } finally {
        if (!ac.signal.aborted) setBrandLoading(false);
      }
    }

    void load();
    return () => ac.abort();
  }, [step, normalizedCompany, brandInsights, guestMode]);

  const continueFromWebsite = () => {
    if (saving) return;
    setError(null);
    if (!normalizedCompany.trim()) {
      setError(t.errors.enterWebsite);
      return;
    }
    if (!companyLooksValid) {
      setError(t.errors.invalidWebsite);
      return;
    }
    const insightsHost = brandInsights?.domain ? normalizedWorkspaceHost(brandInsights.domain) : "";
    const hostMismatch = Boolean(insightsHost && insightsHost !== normalizedCompany);
    const websiteEdited =
      Boolean(lastContinueFromWebsiteHostRef.current) &&
      lastContinueFromWebsiteHostRef.current !== normalizedCompany;
    lastContinueFromWebsiteHostRef.current = normalizedCompany;

    if (hostMismatch || websiteEdited) {
      setBrandInsights(null);
      setWorkspaceChannels(ALL_WORKSPACE_CHANNEL_IDS);
      setWorkspaceAdMarketCodes([]);
      setWorkspaceMarketsGlobal(false);
      setWorkspaceMarketsAuto(true);
      setWorkspaceMarketsPickerExpanded(false);
      workspaceSocialMergedSigRef.current = "";
      setCompanyScrape(emptyWorkspaceScrapeRow(normalizedCompany));
    }
    setStep(1);
  };

  const buildPrePaymentDraft = (): OnboardingDraft => {
    const companyHost = resolveOnboardingCompanyHost({
      companyUrl,
      profileCompanyUrl: initialData?.company_url,
    });
    return {
      v: 1,
      companyUrl: companyUrl.trim() || companyHost,
      companyHost,
      workspaceChannels,
      workspaceAdMarketCodes: [],
      workspaceMarketsGlobal: false,
      workspaceMarketsAuto: true,
      companyScrape: emptyWorkspaceScrapeRow(companyHost),
      brandInsights: brandInsights
        ? {
            ok: brandInsights.ok,
            partial: brandInsights.partial,
            domain: brandInsights.domain,
            brandName: brandInsights.brandName,
            description: brandInsights.description,
            logoUrl: brandInsights.logoUrl,
            contextSnippet: brandInsights.contextSnippet,
            socials: brandInsights.socials,
          }
        : null,
    };
  };

  const finishPrePaymentFlow = async (): Promise<boolean> => {
    if (finishInFlightRef.current) return false;
    finishInFlightRef.current = true;
    setSaving(true);
    setError(null);

    try {
      const companyHost = resolveOnboardingCompanyHost({
        companyUrl,
        profileCompanyUrl: initialData?.company_url,
      });
      if (!isPlausiblePublicHostname(companyHost)) {
        setError(t.errors.invalidWebsiteGoBack);
        if (!postPaymentResume) setStep(STEP_WEBSITE);
        return false;
      }
      if (!workspaceChannelsValid) {
        setError(t.errors.pickPlatform);
        setStep(STEP_WORKSPACE_CHANNELS);
        return false;
      }

      const draft = buildPrePaymentDraft();
      saveOnboardingDraft(draft);

      if (!guestMode) {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
      }

      router.push(buildSignupAfterOnboardingPath(testerInviteCode));
      router.refresh();
      return true;
    } catch {
      setError(t.errors.somethingWrong);
      return false;
    } finally {
      finishInFlightRef.current = false;
      setSaving(false);
    }
  };

  const saveOnboarding = async (options?: { navigate?: boolean }): Promise<boolean> => {
    if (compactPrePaymentFlow) return finishPrePaymentFlow();
    if (finishInFlightRef.current) return false;
    finishInFlightRef.current = true;
    setSaving(true);
    setError(null);
    const shouldNavigate = options?.navigate !== false;

    try {
      const companyHost = resolveOnboardingCompanyHost({
        companyUrl,
        profileCompanyUrl: initialData?.company_url,
      });
      if (!isPlausiblePublicHostname(companyHost)) {
        setError(t.errors.invalidWebsiteGoBack);
        if (!postPaymentResume) setStep(STEP_WEBSITE);
        return false;
      }

      if (!workspaceChannelsValid) {
        setError(t.errors.pickPlatform);
        setStep(STEP_WORKSPACE_CHANNELS);
        return false;
      }

      if (!workspaceMarketsComplete) {
        setError(t.errors.pickRegions);
        setWorkspaceMarketsAuto(true);
        setWorkspaceMarketsGlobal(false);
        setWorkspaceAdMarketCodes([]);
        setWorkspaceMarketsPickerExpanded(true);
        setStep(STEP_WORKSPACE_MARKETS);
        return false;
      }

      if (workspaceChannels.includes("google")) {
        const gv = companyScrape.googleAdsTransparencyUrl.trim();
        if (!gv) {
          setError(t.errors.googleTransparencyRequired);
          setStep(STEP_WORKSPACE_SCRAPE);
          return false;
        }
        const gre = validateIdentifierField("google", gv, t.validation);
        if (!gre.valid && "error" in gre) {
          setError(gre.error);
          setStep(STEP_WORKSPACE_SCRAPE);
          return false;
        }
      }

      const resolvedAdMarketCodes = [...unionAdMarketCodes].sort();

      const primaryName =
        (brandInsights?.brandName?.trim() && brandInsights.brandName.trim()) || hostToBrandLabel(companyHost);
      const logoFromInsights = brandInsights?.logoUrl?.trim() || null;

      const siteHostNoWww = companyHost.replace(/^www\./i, "");
      let scrapePersist = companyScrape;
      const gtCanon =
        workspaceChannels.includes("google") && companyScrape.googleAdsTransparencyUrl.trim()
          ? canonicalGoogleAdsTransparencyStartUrl(companyScrape.googleAdsTransparencyUrl.trim())
          : null;
      if (gtCanon && gtCanon !== companyScrape.googleAdsTransparencyUrl.trim()) {
        scrapePersist = { ...companyScrape, googleAdsTransparencyUrl: gtCanon };
      }

      const scrapeForPersist: WorkspaceAdsScrapeHints = {
        ...scrapePersist,
        websiteUrl: `https://${siteHostNoWww}`,
      };

      const adsSetupJson = adsProfileSetupV1({
        channels: workspaceChannels,
        adMarketCountryCodes: [...effectiveWorkspaceMarketCodes].sort(),
        scrape: scrapeForPersist,
      });

      const hintPayload = {
        v: 4,
        ts: Date.now(),
        workspaceDomain: companyHost,
        workspace: {
          channels: workspaceChannels,
          adMarketCountryCodes: [...effectiveWorkspaceMarketCodes].sort(),
          scrape: scrapeForPersist,
        },
        adMarketCountryCodes: resolvedAdMarketCodes,
        primarySocials: brandInsights?.socials ?? [],
        competitors: [],
      };
      try {
        sessionStorage.setItem(`rival.onboarding_hints.v1.${userId}`, JSON.stringify(hintPayload));
      } catch {
        /* non-fatal */
      }
      try {
        localStorage.setItem(
          "rival.ad_markets.v1",
          JSON.stringify({
            codes: resolvedAdMarketCodes,
            updatedAt: Date.now(),
          }),
        );
      } catch {
        /* non-fatal */
      }

      const supabase = createSupabaseBrowserClient();

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          company_name: primaryName,
          company_url: companyHost,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (profileError) {
        setError(profileError.message);
        return false;
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
        setError(typeof brandJson.error === "string" ? brandJson.error : t.errors.saveBrandFailed);
        return false;
      }

      const competitorPayload = [
        {
          slug: companyHost,
          name: primaryName,
          pending: false,
          brand: {
            name: primaryName,
            domain: companyHost,
            ...(logoFromInsights &&
            !logoFromInsights.includes("google.com/s2/favicons")
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
          let msg: string = raw;
          try {
            const j = JSON.parse(raw) as { error?: string };
            if (typeof j?.error === "string") msg = j.error;
          } catch {
            /* keep msg */
          }
          setError(typeof msg === "string" ? msg : t.errors.saveCompetitorsFailed);
          return false;
        }
      } catch {
        setError(t.errors.serverUnreachable);
        return false;
      }

      if (shouldNavigate) {
        const destination = postPaymentResume ? buildWorkspaceBrandScrapeHref() : postOnboardingPath;
        router.push(destination);
        router.refresh();
      }
      clearOnboardingDraft();
      return true;
    } catch {
      setError(t.errors.finishFailed);
      return false;
    } finally {
      finishInFlightRef.current = false;
      setSaving(false);
    }
  };

  const advanceFromAdProfiles = async () => {
    await saveOnboarding({ navigate: true });
  };

  const totalSteps = useMemo(() => {
    if (compactPrePaymentFlow) return 3;
    if (postPaymentResume) return 2;
    return showPlanStep ? 6 : 5;
  }, [compactPrePaymentFlow, postPaymentResume, showPlanStep]);
  const progressStepIndex = postPaymentResume ? step - STEP_WORKSPACE_MARKETS : step;
  const progressPercent = Math.round(((progressStepIndex + 1) / totalSteps) * 100);
  const isWideOnboardingStep = step === STEP_WORKSPACE_SCRAPE || step === STEP_CHOOSE_PLAN;
  const onboardingCardMaxWidth =
    step === STEP_WORKSPACE_SCRAPE
      ? singleWorkspaceAdProfile
        ? "max-w-md"
        : "max-w-3xl"
      : step === STEP_CHOOSE_PLAN
        ? "max-w-5xl"
        : step === STEP_WORKSPACE_CHANNELS
          ? "max-w-xl"
          : "max-w-[440px]";

  const goBack = () => {
    if (saving) return;
    setError(null);
    if (postPaymentResume) {
      if (step === STEP_WORKSPACE_SCRAPE) {
        setWorkspaceMarketsPickerExpanded(false);
        setStep(STEP_WORKSPACE_MARKETS);
      }
      return;
    }
    if (step === STEP_BRAND) setStep(STEP_WEBSITE);
    else if (step > STEP_BRAND) {
      const prev = step - 1;
      if (prev === STEP_WORKSPACE_MARKETS) {
        setWorkspaceMarketsPickerExpanded(false);
      }
      setStep(prev);
    }
  };

  const showBackButton = guestMode
    ? false
    : postPaymentResume
      ? step === STEP_WORKSPACE_SCRAPE
      : step > 0 && !(step === STEP_BRAND && brandLoading);

  return (
    <div
      className={`w-full rounded-[28px] border border-white/60 bg-white/40 px-7 py-9 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md transition-all duration-300 sm:px-10 sm:py-10 ${
        onboardingCardMaxWidth
      }`}
    >
      <div className="mb-7 flex items-center gap-3 pt-1 sm:mb-8">
        <div className="min-w-0 flex-1">
          <OnboardingProgressBar value={progressPercent} />
        </div>
        <OnboardingCardLocaleSwitcher locale={locale} ariaLabel={copy.localeSwitcherAria} align="end" />
      </div>

      {showBackButton ? (
        <div className="mb-5 sm:mb-6">
          <button
            type="button"
            disabled={saving}
            onClick={goBack}
            className="rounded-lg px-1.5 py-1 text-[13px] font-medium text-gray-600 transition hover:bg-gray-900/5 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t.back}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-[#b42318]">
          {error}
        </p>
      ) : null}

      <div key={step} className="rival-onboarding-step-in">
        {!postPaymentResume && step === 0 ? (
          <>
            <div className="mb-6">
              <h1 id="onb-url-heading" className="text-[22px] font-semibold tracking-tight text-gray-900">
                {t.website.title}
              </h1>
            </div>

            <div>
              <div className="flex min-w-0 items-center gap-0">
                <div
                  className={`shrink-0 overflow-hidden transition-[max-width,margin-inline-end,opacity] duration-300 ease-out motion-reduce:transition-none ${
                    showFaviconSlot ? "pointer-events-auto me-3 max-w-[2.75rem] opacity-100" : "pointer-events-none me-0 max-w-0 opacity-0"
                  }`}
                  aria-hidden={!showFaviconSlot}
                >
                  {showFaviconSlot ? (
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-white/60 bg-white/30 shadow-inner ring-1 ring-gray-900/5">
                      {showTypingSkeleton ? (
                        <div
                          className="absolute inset-0 z-10 animate-pulse bg-gradient-to-br from-gray-200/95 to-gray-300/75 motion-reduce:animate-none motion-reduce:opacity-70"
                          role="status"
                          aria-busy="true"
                          aria-label={t.loadingFavicon}
                        />
                      ) : null}
                      {faviconSrc ? (
                        <DebouncedCompanyFavicon key={faviconSrc} src={faviconSrc} loadingLabel={t.loadingFavicon} />
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <input
                  id="onb-url"
                  type="text"
                  placeholder={t.website.placeholder}
                  value={companyUrl}
                  autoComplete="url"
                  inputMode="url"
                  enterKeyHint="next"
                  maxLength={MAX_COMPANY_INPUT_CHARS}
                  spellCheck={false}
                  aria-labelledby="onb-url-heading"
                  onChange={handleCompanyChange}
                  className={`${glassInputClass} min-w-0 flex-1`}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={continueFromWebsite}
              disabled={!companyLooksValid || saving}
              className="mt-6 w-full rounded-full bg-gray-900 py-3.5 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              {t.continue}
            </button>
          </>
        ) : null}

        {!postPaymentResume && step === 1 ? (
          <>
            <div className="mb-6">
              <h1 className="text-[22px] font-semibold tracking-tight text-gray-900">
                {brandLoading ? t.brand.loadingTitle : t.brand.readyTitle}
              </h1>
            </div>

            {brandLoading ? (
              <div className="rounded-2xl border border-white/50 bg-white/30" aria-busy="true">
                <RivalLoadingBlock size="xl" padded className="py-12" />
              </div>
            ) : brandInsights ? (
              <div className="space-y-5">
                <div className="flex gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={brandInsights.logoUrl || faviconUrlForDomain(normalizedCompany)}
                    alt=""
                    className="size-[72px] shrink-0 rounded-2xl border border-white/60 bg-white object-contain shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-gray-500">
                      {t.brandLabel}
                    </p>
                    <h2 className="mt-0.5 text-[20px] font-bold tracking-tight text-gray-900">
                      {brandInsights.brandName}
                    </h2>
                    <p className="mt-1 text-[13px] font-medium text-gray-600 truncate">{normalizedCompany}</p>
                  </div>
                </div>

                {brandInsights.description ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-gray-500">{t.aboutLabel}</p>
                    <p className="mt-1.5 line-clamp-5 text-[14px] font-medium leading-relaxed text-gray-800">
                      {brandInsights.description}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-[14px] font-medium text-gray-600">{t.brand.emptyState}</p>
            )}

            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep(STEP_WORKSPACE_CHANNELS);
              }}
              disabled={brandLoading || saving}
              className="mt-6 w-full rounded-full bg-gray-900 py-3.5 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              {t.continue}
            </button>
          </>
        ) : null}

        {!postPaymentResume && step === STEP_WORKSPACE_CHANNELS ? (
          <>
            <div className="mb-6">
              <h1 className="text-[22px] font-semibold tracking-tight text-gray-900">{t.platforms.title}</h1>
              <p className="mt-2 text-[14px] leading-relaxed text-gray-600">{t.platforms.body}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {CHANNELS.map(({ id, name, Logo }) => {
                const on = workspaceChannels.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleWorkspaceChannel(id)}
                    className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 rounded-xl border px-2.5 py-3 text-left transition sm:flex sm:items-center sm:gap-4 sm:px-4 sm:py-4 ${
                      on
                        ? "border-[#4a7fa5]/35 bg-white/55 text-gray-900 shadow-sm ring-1 ring-[#4a7fa5]/25"
                        : "border-gray-200/70 bg-white/30 text-gray-700 hover:border-gray-300/80 hover:bg-white/45"
                    }`}
                  >
                    <Logo className="size-7 shrink-0 sm:size-9" />
                    <span className="min-w-0 text-[13px] font-semibold leading-snug sm:flex-1 sm:text-[16px]">
                      {name}
                    </span>
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition sm:size-7 ${
                        on
                          ? "border-[#1a1a2e] bg-[#1a1a2e] text-white"
                          : "border-gray-300/80 bg-white/60"
                      }`}
                      aria-hidden
                    >
                      {on ? <Check className="size-3.5 sm:size-4" strokeWidth={2.75} /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                setError(null);
                if (compactPrePaymentFlow) {
                  void finishPrePaymentFlow();
                  return;
                }
                setWorkspaceMarketsPickerExpanded(false);
                setWorkspaceMarketsAuto(true);
                setWorkspaceMarketsGlobal(false);
                setWorkspaceAdMarketCodes([]);
                setStep(STEP_WORKSPACE_MARKETS);
              }}
              disabled={saving || !workspaceChannelsValid}
              className="mt-6 w-full rounded-full bg-gray-900 py-3.5 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              {compactPrePaymentFlow && saving ? t.saving : t.continueToSignup}
            </button>
          </>
        ) : null}

        {!compactPrePaymentFlow && step === STEP_WORKSPACE_MARKETS ? (
          <>
            <div className="mb-5">
              <h1 className="text-[21px] font-semibold tracking-tight text-gray-900">{t.markets.title}</h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">{t.markets.body}</p>
            </div>
            <div className="space-y-2">
              {!workspaceMarketsPickerExpanded ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-gray-200/70 bg-white/40 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md">
                  {workspaceMarketsAuto ? (
                    <span className="text-[12px] font-semibold tracking-tight text-gray-900">{t.auto}</span>
                  ) : workspaceMarketsGlobal ? (
                    <span className="inline-flex items-center gap-0.5 rounded-md border border-gray-900/25 bg-gray-900/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                      <span className="text-[0.85rem] leading-none" aria-hidden>
                        🌐
                      </span>
                      {t.global}
                    </span>
                  ) : (
                    <MarketCodesSummary codes={workspaceAdMarketCodes} noneLabel={t.noneAddMarkets} />
                  )}
                  <button
                    type="button"
                    onClick={() => setWorkspaceMarketsPickerExpanded(true)}
                    className="text-[11px] font-semibold text-gray-900 underline decoration-gray-300 underline-offset-2 hover:decoration-gray-500"
                  >
                    {t.change}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {!workspaceMarketsGlobal && !workspaceMarketsAuto && workspaceAdMarketCodes.length === 0 ? (
                    <p className="text-[10px] text-amber-900/85">{t.markets.pickHint}</p>
                  ) : null}
                  <AdMarketChips
                    selectedCodes={workspaceMarketsGlobal ? [] : workspaceAdMarketCodes}
                    onToggle={toggleWorkspaceCountryMarket}
                    ariaLabel={t.adMarketsAria}
                    leadingSlot={
                      <button
                        type="button"
                        title={t.globalTerritoryTitle}
                        aria-pressed={workspaceMarketsGlobal}
                        onClick={() => {
                          setWorkspaceMarketsGlobal((was) => {
                            if (!was) {
                              setWorkspaceMarketsAuto(false);
                              setWorkspaceAdMarketCodes([]);
                              return true;
                            }
                            setWorkspaceMarketsAuto(true);
                            setWorkspaceAdMarketCodes([]);
                            return false;
                          });
                        }}
                        className={`inline-flex shrink-0 items-center gap-0.5 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition ${
                          workspaceMarketsGlobal
                            ? "border-gray-900/40 bg-gray-900 text-white shadow-sm"
                            : "border-gray-200/80 bg-white/35 text-gray-600 backdrop-blur-sm hover:bg-white/55 hover:text-gray-900"
                        }`}
                      >
                        <span className="text-[0.85rem] leading-none" aria-hidden>
                          🌐
                        </span>
                        {t.global}
                      </button>
                    }
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!workspaceMarketsGlobal && workspaceAdMarketCodes.length === 0) {
                          setWorkspaceMarketsAuto(true);
                        }
                        setWorkspaceMarketsPickerExpanded(false);
                      }}
                      className="text-[10px] font-semibold text-gray-500 hover:text-gray-900"
                    >
                      {t.done}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep(STEP_WORKSPACE_SCRAPE);
              }}
              disabled={saving || !workspaceMarketsComplete}
              className="mt-6 w-full rounded-full bg-gray-900 py-3.5 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              {t.continue}
            </button>
          </>
        ) : null}

        {!compactPrePaymentFlow && step === STEP_WORKSPACE_SCRAPE ? (
          <>
            <div className="mb-5">
              <h1 className="text-[21px] font-semibold tracking-tight text-gray-900">{t.profiles.title}</h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
                {t.profiles.body}&nbsp;
                <span className="font-semibold text-gray-800">{t.profiles.bodyEmphasis}</span>
              </p>
            </div>
            <div
              className={`rounded-xl border border-white/65 bg-white/45 px-4 py-4 shadow-[0_8px_32px_rgba(31,38,135,0.06)] backdrop-blur-md ring-1 ring-gray-900/5 sm:px-5 sm:py-5 ${
                singleWorkspaceAdProfile ? "mx-auto w-full max-w-sm" : "w-full"
              }`}
            >
              <div
                className={`mb-4 flex items-center gap-2.5 ${
                  singleWorkspaceAdProfile ? "justify-center" : ""
                }`}
              >
                <DomainFavicon domain={normalizedCompany} className="size-9 shrink-0" loadingLabel={t.loadingFavicon} />
                <span className="min-w-0 break-all text-[15px] font-semibold text-gray-900">{normalizedCompany}</span>
              </div>

              <div
                className={
                  singleWorkspaceAdProfile
                    ? "grid grid-cols-1 gap-3"
                    : "grid grid-cols-1 gap-3 md:grid-cols-2"
                }
              >
                {workspaceChannelSet.has("meta") ? (
                  <div className={`${workspaceAdProfileCellClass}`}>
                    <WorkspaceAdProfileField
                      Logo={MetaLogo}
                      label="Meta"
                      previewHref={buildMetaAdsLibraryPreviewUrl(companyScrape.metaAdsLibraryUrl)}
                      placeholder={t.profiles.metaPlaceholder}
                      value={companyScrape.metaAdsLibraryUrl}
                      onChange={(v) => patchCompanyScrape({ metaAdsLibraryUrl: v })}
                      onBlur={() => {
                        const v = companyScrape.metaAdsLibraryUrl.trim();
                        if (!v) return;
                        const canon = canonicalMetaAdsLibraryUrl(v);
                        if (canon && canon !== v) {
                          patchCompanyScrape({ metaAdsLibraryUrl: canon });
                        }
                      }}
                      error={workspaceMetaInputError}
                      {...openLinkFor("Meta")}
                    />
                  </div>
                ) : null}

                {workspaceChannelSet.has("google") ? (
                  <div className={`${workspaceAdProfileCellClass}`}>
                    <WorkspaceAdProfileField
                      Logo={GoogleLogo}
                      label="Google"
                      previewHref={buildGoogleTransparencyPreviewUrl(companyScrape.googleAdsTransparencyUrl)}
                      placeholder={t.profiles.googlePlaceholder}
                      value={companyScrape.googleAdsTransparencyUrl}
                      onChange={(v) => patchCompanyScrape({ googleAdsTransparencyUrl: v })}
                      onBlur={() => {
                        const v = companyScrape.googleAdsTransparencyUrl.trim();
                        if (!v) return;
                        const canon = canonicalGoogleAdsTransparencyStartUrl(v);
                        if (canon && canon !== v) {
                          patchCompanyScrape({ googleAdsTransparencyUrl: canon });
                        }
                      }}
                      error={workspaceGoogleInputError}
                      {...openLinkFor("Google")}
                    />
                  </div>
                ) : null}

                {workspaceChannelSet.has("linkedin") ? (
                  <div className={`${workspaceAdProfileCellClass}`}>
                    <WorkspaceAdProfileField
                      Logo={LinkedInLogo}
                      label="LinkedIn"
                      previewHref={buildLinkedInAdLibraryPreviewUrl(companyScrape.linkedInUrl)}
                      placeholder={t.profiles.linkedInPlaceholder}
                      value={companyScrape.linkedInUrl}
                      onChange={(v) => patchCompanyScrape({ linkedInUrl: v })}
                      onBlur={() => {
                        const v = companyScrape.linkedInUrl.trim();
                        if (!v) return;
                        const canon = canonicalLinkedInAdLibraryUrl(v);
                        if (canon && canon !== v) {
                          patchCompanyScrape({ linkedInUrl: canon });
                        }
                      }}
                      warning={workspaceLinkedInWarning}
                      {...openLinkFor("LinkedIn")}
                    />
                  </div>
                ) : null}

                {workspaceChannelSet.has("tiktok") ? (
                  <div className={`${workspaceAdProfileCellClass}`}>
                    <WorkspaceAdProfileField
                      Logo={TikTokLogo}
                      label="TikTok"
                      previewHref={buildTikTokAdsLibraryPreviewUrl(companyScrape.tiktokKeyword)}
                      placeholder={t.profiles.tiktokPlaceholder}
                      value={companyScrape.tiktokKeyword}
                      onChange={(v) => patchCompanyScrape({ tiktokKeyword: v })}
                      {...openLinkFor("TikTok")}
                    />
                  </div>
                ) : null}

                {workspaceChannelSet.has("snapchat") ? (
                  <div className={`${workspaceAdProfileCellClass}`}>
                    <WorkspaceAdProfileField
                      Logo={SnapchatLogo}
                      label="Snapchat"
                      previewHref={buildSnapchatAdsGalleryPreviewUrl(companyScrape.snapchatKeyword)}
                      placeholder={t.profiles.snapchatPlaceholder}
                      value={companyScrape.snapchatKeyword}
                      onChange={(v) => patchCompanyScrape({ snapchatKeyword: v })}
                      {...openLinkFor("Snapchat")}
                    />
                  </div>
                ) : null}

                {workspaceChannelSet.has("pinterest") ? (
                  <div className={`${workspaceAdProfileCellClass}`}>
                    <WorkspaceAdProfileField
                      Logo={PinterestLogo}
                      label="Pinterest"
                      previewHref={buildPinterestAdsPreviewUrl(companyScrape.pinterestKeyword)}
                      placeholder={t.profiles.pinterestPlaceholder}
                      value={companyScrape.pinterestKeyword}
                      onChange={(v) => patchCompanyScrape({ pinterestKeyword: v })}
                      {...openLinkFor("Pinterest")}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void advanceFromAdProfiles()}
              disabled={saving}
              className="mt-6 w-full rounded-full bg-gray-900 py-3.5 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              {saving
                ? postPaymentResume
                  ? t.actions.startingScrape
                  : t.actions.settingUp
                : postPaymentResume
                  ? t.actions.startScraping
                  : showPlanStep
                    ? t.continue
                    : t.actions.getStarted}
            </button>
          </>
        ) : null}

        {step === STEP_CHOOSE_PLAN && showPlanStep ? (
          <PlanPickerContent
            copy={copy.planPicker}
            variant="onboarding"
            dashboardNext={postOnboardingPath}
            testerInviteActive={testerInviteActive}
          />
        ) : null}
      </div>
    </div>
  );
}

