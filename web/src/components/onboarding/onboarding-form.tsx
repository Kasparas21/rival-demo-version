"use client";

import { Building2, Check, ExternalLink, Link2, Loader2, X } from "lucide-react";
import {
  GoogleLogo,
  LinkedInLogo,
  MetaLogo,
  PinterestLogo,
  SnapchatLogo,
  TikTokLogo,
} from "@/components/platform-logos";
import { FacebookLogo } from "@/components/icons/facebook-logo";
import { InstagramMark } from "@/components/icons/instagram-mark";
import { LinkedInMark } from "@/components/icons/linkedin-mark";
import { TikTokMark } from "@/components/icons/tiktok-mark";
import { SocialProfileIcon } from "@/components/onboarding/social-profile-icon";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { glassInputClass } from "@/components/ui/glass-styles";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isMissingDbColumnError } from "@/lib/supabase/postgrest-schema-error";
import {
  hostToBrandLabel,
  isPlausiblePublicHostname,
  MAX_COMPANY_INPUT_CHARS,
  MAX_ONBOARDING_COMPETITORS,
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
import { brandSlugFromDomain } from "@/lib/discovery";
import { socialNetworkBucket } from "@/lib/onboarding/social-profile-utils";
import { validateIdentifierField } from "@/lib/validate-identifier-field";
import {
  canonicalLinkedInAdLibraryUrl,
  canonicalMetaAdsLibraryUrl,
} from "@/lib/ad-library/canonical-library-url";
import {
  buildGoogleTransparencyPreviewUrl,
  buildLinkedInAdLibraryPreviewUrl,
  buildMetaAdsLibraryPreviewUrl,
  buildPinterestAdsPreviewUrl,
  buildSnapchatAdsGalleryPreviewUrl,
  buildTikTokAdsLibraryPreviewUrl,
} from "@/lib/onboarding/ad-library-preview-urls";
import { CHANNELS, type ChannelId } from "@/components/channel-picker-modal";
import {
  adsProfileSetupV1,
  emptyWorkspaceScrapeRow,
  mergeWorkspaceScrapeFromSocials,
  type WorkspaceAdsScrapeHints,
} from "@/lib/onboarding/workspace-ads-setup";

/** Shorter fields on the workspace ad-profile onboarding step */
const workspaceAdProfileInputClass = `${glassInputClass} rounded-xl px-3 py-1.5 text-[13px]`;

/** Text + icon Preview, same spirit as competitor confirmation */
const onboardingLibraryPreviewLinkClass =
  "inline-flex shrink-0 items-center gap-1 border border-transparent px-1 py-0.5 text-[11px] font-semibold text-[#1e6fa8] transition hover:bg-[#f8fcff] hover:text-[#155a8a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e6fa8]/30 focus-visible:ring-offset-1";

const TOTAL_ONBOARD_STEPS = 7;
/** step indices */
const STEP_WEBSITE = 0;
const STEP_BRAND = 1;
const STEP_WORKSPACE_CHANNELS = 2;
const STEP_WORKSPACE_MARKETS = 3;
const STEP_WORKSPACE_SCRAPE = 4;
const STEP_RIVAL_MARKETS = 5;
const STEP_RIVAL_SCRAPE = 6;

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
function DebouncedCompanyFavicon({ src }: { src: string }) {
  const [phase, setPhase] = useState<"loading" | "loaded" | "error">("loading");

  return (
    <>
      {phase === "loading" ? (
        <div
          className="absolute inset-0 z-[1] animate-pulse bg-gradient-to-br from-gray-200/95 to-gray-300/75"
          role="status"
          aria-label="Loading favicon"
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

function DomainFavicon({ domain, className }: { domain: string; className?: string }) {
  const src = faviconUrlForDomain(domain);
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg border border-white/50 bg-white/40 shadow-sm ${className ?? "size-9"}`}
    >
      <DebouncedCompanyFavicon src={src} />
    </div>
  );
}

function adMarketSummariesForCodes(codes: string[]): { code: string; shortTag: string }[] {
  const set = new Set(codes);
  return ONBOARDING_AD_MARKETS.filter((m) => set.has(m.code)).map((m) => ({ code: m.code, shortTag: m.shortTag }));
}

function MarketCodesSummary({ codes }: { codes: string[] }) {
  const items = adMarketSummariesForCodes(codes);
  if (items.length === 0)
    return <span className="text-[10px] font-semibold text-amber-900/85">None — add markets</span>;
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
}: {
  selectedCodes: string[];
  onToggle: (code: string) => void;
  leadingSlot?: ReactNode;
}) {
  return (
    <div className="relative -mx-1">
      <div
        className="flex max-w-full flex-nowrap gap-1 overflow-x-auto overscroll-x-contain scroll-smooth rounded-lg border border-gray-200/70 bg-white/40 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Ad markets"
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

type CompetitorScrapeInputs = {
  websiteUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  tikTokUrl: string;
  linkedInUrl: string;
  youTubeUrl: string;
  snapchatKeyword: string;
};

function emptyScrapeRow(domain: string): CompetitorScrapeInputs {
  return {
    websiteUrl: `https://${domain}`,
    facebookUrl: "",
    instagramUrl: "",
    tikTokUrl: "",
    linkedInUrl: "",
    youTubeUrl: "",
    snapchatKeyword: hostToBrandLabel(domain),
  };
}

function firstHrefForBucket(socials: Array<{ href: string }>, bucket: string): string {
  for (const s of socials) {
    if (socialNetworkBucket(s.href) === bucket) return s.href;
  }
  return "";
}

function mergeScrapeFromSocials(
  domain: string,
  row: CompetitorScrapeInputs,
  socials: Array<{ href: string }>,
): CompetitorScrapeInputs {
  const out = { ...row };
  if (!out.websiteUrl.trim()) out.websiteUrl = `https://${domain}`;
  if (!out.facebookUrl.trim()) out.facebookUrl = firstHrefForBucket(socials, "facebook");
  if (!out.instagramUrl.trim()) out.instagramUrl = firstHrefForBucket(socials, "instagram");
  if (!out.tikTokUrl.trim()) out.tikTokUrl = firstHrefForBucket(socials, "tiktok");
  if (!out.linkedInUrl.trim()) out.linkedInUrl = firstHrefForBucket(socials, "linkedin");
  if (!out.youTubeUrl.trim()) out.youTubeUrl = firstHrefForBucket(socials, "youtube");
  if (!out.snapchatKeyword.trim()) {
    const snap = firstHrefForBucket(socials, "snapchat");
    if (snap) {
      try {
        const u = new URL(snap);
        const parts = u.pathname.split("/").filter(Boolean);
        const addIdx = parts.indexOf("add");
        if (addIdx >= 0 && parts[addIdx + 1]) {
          out.snapchatKeyword = decodeURIComponent(parts[addIdx + 1]!);
        }
      } catch {
        /* ignore */
      }
    }
    if (!out.snapchatKeyword.trim()) out.snapchatKeyword = hostToBrandLabel(domain);
  }
  return out;
}

type Props = {
  userId: string;
  postOnboardingPath?: string;
  initialData: {
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

type CompetitorEnrichmentRow = {
  socials: { label: string; href: string; handle: string }[];
};

export function OnboardingForm({ userId, postOnboardingPath = "/dashboard/spy", initialData }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finishInFlightRef = useRef(false);
  /** Last website host seen when advancing from step 0 — invalidates caches when edited */
  const lastContinueFromWebsiteHostRef = useRef<string>("");
  const competitorEnrichmentKeyRef = useRef<string | null>(null);

  const [companyUrl, setCompanyUrl] = useState(() =>
    sanitizeCompanyUrlInput(initialData?.company_url ?? "")
  );

  const [brandLoading, setBrandLoading] = useState(false);
  const [brandInsights, setBrandInsights] = useState<BrandInsightsPayload | null>(null);

  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);
  const [manualCompetitor, setManualCompetitor] = useState("");

  const [competitorEnrichment, setCompetitorEnrichment] = useState<Record<string, CompetitorEnrichmentRow>>({});
  const [competitorEnrichmentLoading, setCompetitorEnrichmentLoading] = useState(false);
  /** Per-rival ad markets (union is persisted for scraping). With no rivals, defaults are applied at finish (see DEFAULT_ONBOARDING_AD_MARKETS). */
  const [competitorAdMarkets, setCompetitorAdMarkets] = useState<Record<string, string[]>>({});
  /** Full market picker expanded for one competitor host */
  const [adMarketsExpandedFor, setAdMarketsExpandedFor] = useState<string | null>(null);
  /** Editable ad-library / scraper hints (step 3) */
  const [competitorScrapeInputs, setCompetitorScrapeInputs] = useState<
    Record<string, CompetitorScrapeInputs>
  >({});
  /** Workspace (your ads) — same ads-library surface as rivals */
  const [workspaceChannels, setWorkspaceChannels] = useState<ChannelId[]>(() => CHANNELS.map((c) => c.id));
  const [workspaceAdMarketCodes, setWorkspaceAdMarketCodes] = useState<string[]>([]);
  /** When true, all supported ISO markets apply (exclusive with manual country picks). */
  const [workspaceMarketsGlobal, setWorkspaceMarketsGlobal] = useState(false);
  const [companyScrape, setCompanyScrape] = useState<WorkspaceAdsScrapeHints>(() => emptyWorkspaceScrapeRow(""));
  const workspaceSocialMergedSigRef = useRef("");
  const socialEnrichmentSigRef = useRef<Record<string, string>>({});

  const effectiveWorkspaceMarketCodes = useMemo(
    () =>
      workspaceMarketsGlobal ? [...ONBOARDING_AD_MARKET_CODES] : workspaceAdMarketCodes,
    [workspaceMarketsGlobal, workspaceAdMarketCodes],
  );

  const unionAdMarketCodes = useMemo(() => {
    const u = new Set<string>();
    for (const c of effectiveWorkspaceMarketCodes) u.add(c);
    for (const h of selectedCompetitors) {
      for (const c of competitorAdMarkets[h] ?? []) u.add(c);
    }
    if (u.size === 0) return [...DEFAULT_ONBOARDING_AD_MARKETS];
    return [...u];
  }, [effectiveWorkspaceMarketCodes, selectedCompetitors, competitorAdMarkets]);

  const normalizedCompany = useMemo(() => normalizedWorkspaceHost(companyUrl.trim()), [companyUrl]);
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
  const workspaceSiteHostNoWww = normalizedCompany.replace(/^www\./i, "");
  const workspaceAutoKeywordSlug = useMemo(() => {
    if (!workspaceSiteHostNoWww) return "";
    return brandSlugFromDomain(workspaceSiteHostNoWww).replace(/^@+/u, "").trim();
  }, [workspaceSiteHostNoWww]);

  const toggleWorkspaceChannel = useCallback((id: ChannelId) => {
    setWorkspaceChannels((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const toggleWorkspaceCountryMarket = useCallback((code: string) => {
    setWorkspaceMarketsGlobal(false);
    setWorkspaceAdMarketCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }, []);

  const workspaceMetaInputError = useMemo(() => {
    const v = companyScrape.metaAdsLibraryUrl.trim();
    if (!v) return null;
    const r = validateIdentifierField("meta", v);
    return r.valid || !("error" in r) ? null : r.error;
  }, [companyScrape.metaAdsLibraryUrl]);

  const workspaceLinkedInWarning = useMemo(() => {
    const v = companyScrape.linkedInUrl.trim();
    if (!v) return null;
    const r = validateIdentifierField("linkedin", v);
    return r.valid || !("warning" in r) ? null : r.warning;
  }, [companyScrape.linkedInUrl]);

  const patchCompanyScrape = useCallback((patch: Partial<WorkspaceAdsScrapeHints>) => {
    setCompanyScrape((prev) => ({
      ...emptyWorkspaceScrapeRow(normalizedCompany),
      ...prev,
      ...patch,
    }));
  }, [normalizedCompany]);

  const workspaceChannelsValid = workspaceChannels.length > 0;
  const workspaceMarketsComplete =
    workspaceChannels.length === 0 || workspaceMarketsGlobal || workspaceAdMarketCodes.length > 0;
  const workspaceChannelSet = useMemo(() => new Set(workspaceChannels), [workspaceChannels]);

  const step2MarketsComplete = useMemo(() => {
    if (selectedCompetitors.length === 0) return true;
    return selectedCompetitors.every((h) => (competitorAdMarkets[h] ?? []).length > 0);
  }, [selectedCompetitors, competitorAdMarkets]);

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

    setCompanyScrape((prev) => {
      const base = mergeSocialLinks
        ? mergeWorkspaceScrapeFromSocials(normalizedCompany, prev, socials)
        : prev;

      const hostNoWww = normalizedCompany.replace(/^www\./i, "");
      if (!companyLooksValid || !hostNoWww) return base;

      const patch: Partial<WorkspaceAdsScrapeHints> = {};
      if (workspaceChannels.includes("google") && !base.googleAdsDomain.trim()) {
        patch.googleAdsDomain = hostNoWww;
      }
      const kwBase = workspaceAutoKeywordSlug.trim();
      if (workspaceChannels.includes("tiktok") && !base.tiktokKeyword.trim() && kwBase) {
        patch.tiktokKeyword = kwBase;
      }
      if (workspaceChannels.includes("snapchat") && !base.snapchatKeyword.trim() && kwBase) {
        patch.snapchatKeyword = kwBase;
      }
      if (workspaceChannels.includes("pinterest") && !base.pinterestKeyword.trim() && kwBase) {
        patch.pinterestKeyword = kwBase;
      }

      if (Object.keys(patch).length === 0) return base;
      return {
        ...emptyWorkspaceScrapeRow(normalizedCompany),
        ...base,
        ...patch,
      };
    });
  }, [
    step,
    normalizedCompany,
    brandInsights,
    companyLooksValid,
    workspaceChannels,
    workspaceAutoKeywordSlug,
  ]);

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
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: normalizedCompany }),
          signal: ac.signal,
        });
        const data = (await res.json()) as BrandInsightsPayload & { error?: string };
        if (!res.ok || !data.ok) {
          if (!ac.signal.aborted) {
            setBrandInsights(null);
            setError(typeof data.error === "string" ? data.error : "Could not load brand preview.");
          }
          return;
        }
        if (!ac.signal.aborted) setBrandInsights(data);
      } catch {
        if (!ac.signal.aborted)
          setError("Network error while scanning your website. Try again or continue manually.");
      } finally {
        if (!ac.signal.aborted) setBrandLoading(false);
      }
    }

    void load();
    return () => ac.abort();
  }, [step, normalizedCompany, brandInsights]);

  /** Firecrawl scrape for added rival domains — homepage social links only */
  useEffect(() => {
    if (step !== STEP_RIVAL_MARKETS && step !== STEP_RIVAL_SCRAPE) return;

    const sel = [...selectedCompetitors].filter(Boolean).sort();
    const key = `${normalizedCompany}|${sel.join(";")}`;
    if (sel.length === 0) {
      competitorEnrichmentKeyRef.current = null;
      return;
    }
    if (competitorEnrichmentKeyRef.current === key) {
      return;
    }

    const ac = new AbortController();

    async function enrich() {
      setCompetitorEnrichmentLoading(true);
      try {
        const res = await fetch("/api/onboarding/competitor-enrichment", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domains: sel }),
          signal: ac.signal,
        });
        const data = (await res.json()) as {
          ok?: boolean;
          byDomain?: Record<string, CompetitorEnrichmentRow>;
        };
        if (ac.signal.aborted || !data.ok || !data.byDomain) return;
        competitorEnrichmentKeyRef.current = key;
        const slim: Record<string, CompetitorEnrichmentRow> = {};
        for (const [d, row] of Object.entries(data.byDomain)) {
          slim[d] = { socials: row.socials ?? [] };
        }
        setCompetitorEnrichment(slim);
      } finally {
        if (!ac.signal.aborted) setCompetitorEnrichmentLoading(false);
      }
    }

    void enrich();
    return () => ac.abort();
  }, [step, normalizedCompany, selectedCompetitors]);

  useEffect(() => {
    if (step !== STEP_RIVAL_MARKETS && step !== STEP_RIVAL_SCRAPE) return;
    setCompetitorScrapeInputs((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const d of selectedCompetitors) {
        if (!next[d]) {
          next[d] = emptyScrapeRow(d);
          changed = true;
        }
        const socials = competitorEnrichment[d]?.socials ?? [];
        const sig = socials.map((s) => s.href).sort().join("|");
        const prevSig = socialEnrichmentSigRef.current[d] ?? "";
        if (sig === prevSig) continue;
        socialEnrichmentSigRef.current[d] = sig;
        const merged = mergeScrapeFromSocials(d, next[d]!, socials);
        next[d] = merged;
        changed = true;
      }
      for (const k of Object.keys(next)) {
        if (!selectedCompetitors.includes(k)) {
          delete next[k];
          delete socialEnrichmentSigRef.current[k];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [step, selectedCompetitors, competitorEnrichment]);

  const continueFromWebsite = () => {
    if (saving) return;
    setError(null);
    if (!normalizedCompany.trim()) {
      setError("Enter your company website.");
      return;
    }
    if (!companyLooksValid) {
      setError("That doesn’t look like a valid website. Use something like acme.com or yourwebsite.com.");
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
      competitorEnrichmentKeyRef.current = null;
      setCompetitorEnrichment({});
      setSelectedCompetitors([]);
      setCompetitorAdMarkets({});
      setCompetitorScrapeInputs({});
      socialEnrichmentSigRef.current = {};
      setAdMarketsExpandedFor(null);
      setWorkspaceChannels(CHANNELS.map((c) => c.id));
      setWorkspaceAdMarketCodes([]);
      setWorkspaceMarketsGlobal(false);
      workspaceSocialMergedSigRef.current = "";
      setCompanyScrape(emptyWorkspaceScrapeRow(normalizedCompany));
    }
    setStep(1);
  };

  const toggleCompetitor = useCallback((d: string) => {
    const host = normalizedWorkspaceHost(d);
    if (!isPlausiblePublicHostname(host) || host === normalizedCompany) return;
    setSelectedCompetitors((prev) => {
      if (prev.includes(host)) {
        setCompetitorAdMarkets((m) => {
          const rest = { ...m };
          delete rest[host];
          return rest;
        });
        setAdMarketsExpandedFor((cur) => (cur === host ? null : cur));
        return prev.filter((x) => x !== host);
      }
      if (prev.length >= MAX_ONBOARDING_COMPETITORS) return prev;
      setCompetitorAdMarkets((m) => {
        const inferred = inferAdMarketFromHostname(host);
        return { ...m, [host]: inferred ? [inferred] : [] };
      });
      return [...prev, host];
    });
  }, [normalizedCompany]);

  const addManualCompetitor = useCallback(() => {
    setError(null);
    const host = normalizedWorkspaceHost(manualCompetitor);
    if (!isPlausiblePublicHostname(host)) {
      setError("Enter a valid competitor domain.");
      return;
    }
    if (host === normalizedCompany) {
      setError("Pick a competitor that isn’t your own site.");
      return;
    }
    setSelectedCompetitors((prev) => {
      if (prev.includes(host)) return prev;
      if (prev.length >= MAX_ONBOARDING_COMPETITORS) return prev;
      setCompetitorAdMarkets((m) => {
        const inferred = inferAdMarketFromHostname(host);
        return { ...m, [host]: inferred ? [inferred] : [] };
      });
      return [...prev, host];
    });
    setManualCompetitor("");
  }, [manualCompetitor, normalizedCompany]);

  const toggleCompetitorAdMarket = useCallback((host: string, code: string) => {
    setCompetitorAdMarkets((prev) => {
      const cur = prev[host] ?? [];
      const nextList = cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code];
      return { ...prev, [host]: nextList };
    });
  }, []);

  const patchCompetitorScrape = useCallback((domain: string, patch: Partial<CompetitorScrapeInputs>) => {
    setCompetitorScrapeInputs((prev) => ({
      ...prev,
      [domain]: { ...(prev[domain] ?? emptyScrapeRow(domain)), ...patch },
    }));
  }, []);

  const finish = async () => {
    if (finishInFlightRef.current) return;
    finishInFlightRef.current = true;
    setSaving(true);
    setError(null);

    try {
      const companyHost = normalizedCompany;
      if (!isPlausiblePublicHostname(companyHost)) {
        setError("That doesn’t look like a valid website. Go back and fix your company URL.");
        setStep(0);
        return;
      }

      const hosts = selectedCompetitors.filter((h) => h !== companyHost).slice(0, MAX_ONBOARDING_COMPETITORS);

      if (!workspaceChannelsValid) {
        setError("Pick at least one platform where your brand runs ads.");
        setStep(STEP_WORKSPACE_CHANNELS);
        return;
      }

      if (!workspaceMarketsComplete) {
        setError("Pick Global or at least one region for your own ads.");
        setWorkspaceMarketsGlobal(false);
        setWorkspaceAdMarketCodes((prev) =>
          prev.length > 0 ? prev : defaultWorkspaceAdMarketCodes(companyHost),
        );
        setStep(STEP_WORKSPACE_MARKETS);
        return;
      }

      if (hosts.length > 0) {
        for (const h of hosts) {
          const codes = competitorAdMarkets[h] ?? [];
          if (codes.length === 0) {
            setError(`Choose at least one ad market for ${h}.`);
            setStep(STEP_RIVAL_MARKETS);
            return;
          }
        }
      }

      const resolvedAdMarketCodes = [...unionAdMarketCodes].sort();

      const primaryName =
        (brandInsights?.brandName?.trim() && brandInsights.brandName.trim()) || hostToBrandLabel(companyHost);
      const logoFromInsights = brandInsights?.logoUrl?.trim() || null;

      const siteHostNoWww = companyHost.replace(/^www\./i, "");
      const scrapeForPersist: WorkspaceAdsScrapeHints = {
        ...companyScrape,
        websiteUrl: `https://${siteHostNoWww}`,
        googleAdsDomain: (companyScrape.googleAdsDomain.trim() || siteHostNoWww).trim(),
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
        competitors: selectedCompetitors
          .filter((h) => h !== companyHost)
          .slice(0, MAX_ONBOARDING_COMPETITORS)
          .map((d) => ({
            domain: d,
            socials: competitorEnrichment[d]?.socials ?? [],
            adMarketCountryCodes: [...(competitorAdMarkets[d] ?? [])].sort(),
            scrape: competitorScrapeInputs[d] ?? emptyScrapeRow(d),
          })),
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
        return;
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
        setError(typeof brandJson.error === "string" ? brandJson.error : "Could not save workspace brand.");
        return;
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
        ...hosts.map((domain) => {
          const label = hostToBrandLabel(domain);
          return {
            slug: domain,
            name: label,
            pending: false,
            brand: { name: label, domain },
          };
        }),
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
          setError(typeof msg === "string" ? msg : "Could not save account competitors.");
          return;
        }
      } catch {
        setError("Could not reach the server to save monitored brands.");
        return;
      }

      router.push(postOnboardingPath);
      router.refresh();
    } catch {
      setError("Something went wrong while finishing onboarding. Try again.");
    } finally {
      finishInFlightRef.current = false;
      setSaving(false);
    }
  };

  const stepLabels = [
    "Website",
    "Your brand",
    "Your platforms",
    "Your regions",
    "Your profiles",
    "Rival regions",
    "Rivals",
  ];
  const totalSteps = TOTAL_ONBOARD_STEPS;

  const goBack = () => {
    if (saving) return;
    setError(null);
    if (step === STEP_BRAND) setStep(STEP_WEBSITE);
    else if (step > STEP_BRAND) setStep(step - 1);
  };

  return (
    <div className="w-full rounded-[28px] border border-white/60 bg-white/40 px-7 py-9 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md transition-all duration-300 sm:px-10 sm:py-10">
      <div className="mb-5 flex items-center justify-between gap-2 sm:mb-6">
        <div className="flex min-w-0 shrink-0 items-center">
          {step > 0 ? (
            <button
              type="button"
              disabled={(step === STEP_BRAND && brandLoading) || saving}
              onClick={goBack}
              className="rounded-lg px-1.5 py-1 text-[13px] font-medium text-gray-600 transition hover:bg-gray-900/5 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Back
            </button>
          ) : (
            <span className="inline-block w-[4.25rem]" aria-hidden />
          )}
        </div>
        <div className="flex items-center justify-end gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_ONBOARD_STEPS }, (_, i) => i).map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-6 bg-gray-900" : i < step ? "w-3 bg-gray-900/50" : "w-3 bg-gray-900/15"
                }`}
                title={stepLabels[i]}
              />
            ))}
          </div>
          <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
            Step {step + 1} of {totalSteps}
          </p>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-[#b42318]">
          {error}
        </p>
      ) : null}

      <div key={step} className="rival-onboarding-step-in">
        {step === 0 ? (
          <>
            <div className="mb-8">
              <h1 className="text-[22px] font-semibold tracking-tight text-gray-900">Your website</h1>
            </div>

            <div>
              <label htmlFor="onb-url" className="mb-1.5 block text-[13px] font-semibold text-gray-900">
                Company website
              </label>
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
                          aria-label="Loading favicon"
                        />
                      ) : null}
                      {faviconSrc ? <DebouncedCompanyFavicon key={faviconSrc} src={faviconSrc} /> : null}
                    </div>
                  ) : null}
                </div>
                <input
                  id="onb-url"
                  type="text"
                  placeholder="yourwebsite.com"
                  value={companyUrl}
                  autoComplete="url"
                  inputMode="url"
                  enterKeyHint="next"
                  maxLength={MAX_COMPANY_INPUT_CHARS}
                  spellCheck={false}
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
              Continue →
            </button>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <div className="mb-6">
              <h1 className="text-[22px] font-semibold tracking-tight text-gray-900">
                {brandLoading ? "Pulling your brand" : "Looks good"}
              </h1>
            </div>

            {brandLoading ? (
              <div
                className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/50 bg-white/30 py-14 text-center"
                aria-busy="true"
              >
                <Loader2 className="size-9 animate-spin text-gray-900/70 motion-reduce:animate-none" />
                <p className="text-[15px] font-medium text-gray-800">Scanning your homepage…</p>
              </div>
            ) : brandInsights ? (
              <div className="space-y-5">
                {brandInsights.partial && brandInsights.message ? (
                  <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-[13px] font-medium text-amber-950">
                    {brandInsights.message}{" "}
                    <span className="text-amber-900/90">You can still continue.</span>
                  </p>
                ) : null}

                <div className="flex gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={brandInsights.logoUrl || faviconUrlForDomain(normalizedCompany)}
                    alt=""
                    className="size-[72px] shrink-0 rounded-2xl border border-white/60 bg-white object-contain shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-gray-500">
                      Brand
                    </p>
                    <h2 className="mt-0.5 text-[20px] font-bold tracking-tight text-gray-900">
                      {brandInsights.brandName}
                    </h2>
                    <p className="mt-1 text-[13px] font-medium text-gray-600 truncate">{normalizedCompany}</p>
                  </div>
                </div>

                {brandInsights.description ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-gray-500">About</p>
                    <p className="mt-1.5 line-clamp-5 text-[14px] font-medium leading-relaxed text-gray-800">
                      {brandInsights.description}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-[14px] font-medium text-gray-600">Nothing loaded — go back or continue.</p>
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
              Continue →
            </button>
          </>
        ) : null}

        {step === STEP_WORKSPACE_CHANNELS ? (
          <>
            <div className="mb-5">
              <h1 className="text-[21px] font-semibold tracking-tight text-gray-900">Your ad platforms</h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
                Tell us everywhere you actively run ads. We scrape those libraries to map the angles, creatives, and
                offers your company&apos;s pushing right now—which powers strategy comparisons vs rivals.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CHANNELS.map(({ id, name, Logo }) => {
                const on = workspaceChannels.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleWorkspaceChannel(id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-[13px] font-semibold transition ${
                      on
                        ? "border-white/80 bg-white/50 text-gray-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-md ring-1 ring-gray-900/10"
                        : "border-gray-200/65 bg-white/35 text-gray-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-md hover:border-gray-300/70 hover:bg-white/50"
                    }`}
                  >
                    <Logo className="size-7 shrink-0" />
                    <span className="min-w-0 flex-1">{name}</span>
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full border ${
                        on
                          ? "border-gray-900/35 bg-gray-900 text-white"
                          : "border-gray-300/55 bg-white/50 text-gray-400"
                      }`}
                      aria-hidden
                    >
                      {on ? <Check className="size-4" strokeWidth={2.75} /> : <X className="size-4" strokeWidth={2} />}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setWorkspaceAdMarketCodes((prev) =>
                  workspaceMarketsGlobal ? [] : prev.length > 0 ? prev : defaultWorkspaceAdMarketCodes(normalizedCompany),
                );
                setStep(STEP_WORKSPACE_MARKETS);
              }}
              disabled={saving || !workspaceChannelsValid}
              className="mt-6 w-full rounded-full bg-gray-900 py-3.5 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              Continue →
            </button>
          </>
        ) : null}

        {step === STEP_WORKSPACE_MARKETS ? (
          <>
            <div className="mb-5">
              <h1 className="text-[21px] font-semibold tracking-tight text-gray-900">Regions for your ads</h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
                Markets power filters across Meta Ads Library, Google Transparency, TikTok Library, and more.
              </p>
            </div>
            <div className="space-y-2">
              {!workspaceMarketsGlobal && workspaceAdMarketCodes.length === 0 ? (
                <p className="text-[10px] text-amber-900/85">Pick Global or at least one country.</p>
              ) : null}
              <AdMarketChips
                selectedCodes={workspaceMarketsGlobal ? [] : workspaceAdMarketCodes}
                onToggle={toggleWorkspaceCountryMarket}
                leadingSlot={
                  <button
                    type="button"
                    title="Include every supported territory"
                    aria-pressed={workspaceMarketsGlobal}
                    onClick={() => {
                      setWorkspaceMarketsGlobal((was) => {
                        if (!was) {
                          setWorkspaceAdMarketCodes([]);
                          return true;
                        }
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
                    Global
                  </button>
                }
              />
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
              Continue →
            </button>
          </>
        ) : null}

        {step === STEP_WORKSPACE_SCRAPE ? (
          <>
            <div className="mb-5">
              <h1 className="text-[21px] font-semibold tracking-tight text-gray-900">Your ad profiles</h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
                We scrape each Ads Library endpoint you authorize so we can map the creatives, hooks, and funnels your
                company is leaning on—which feeds strategy benchmarks vs rivals.&nbsp;
                <span className="font-semibold text-gray-800">
                  Your site domain is already on file from step one—we don&apos;t need it again here.
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-white/65 bg-white/45 px-3 py-3 shadow-[0_8px_32px_rgba(31,38,135,0.06)] backdrop-blur-md ring-1 ring-gray-900/5">
              <div className="mb-3 flex items-center gap-2">
                <DomainFavicon domain={normalizedCompany} className="size-8 shrink-0" />
                <span className="min-w-0 break-all text-[13px] font-semibold text-gray-900">{normalizedCompany}</span>
              </div>

              <div className="space-y-3">
                {workspaceChannelSet.has("meta") ? (
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-gray-800">
                        <MetaLogo className="size-3.5 shrink-0" />
                        Meta Ads Library URL
                      </div>
                      <a
                        href={buildMetaAdsLibraryPreviewUrl(companyScrape.metaAdsLibraryUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Preview in new tab"
                        className={onboardingLibraryPreviewLinkClass}
                      >
                        <ExternalLink className="size-3 shrink-0 opacity-75" aria-hidden />
                        Preview
                      </a>
                    </div>
                    <p className="text-[10px] leading-snug text-gray-500">
                      Advertiser view from&nbsp;
                      <span className="font-semibold text-gray-700">facebook.com/ads/library</span>
                      , not your Page URL.
                    </p>
                    <input
                      type="text"
                      placeholder="Ads Library advertiser URL"
                      value={companyScrape.metaAdsLibraryUrl}
                      spellCheck={false}
                      onChange={(e) => patchCompanyScrape({ metaAdsLibraryUrl: e.target.value })}
                      onBlur={() => {
                        const v = companyScrape.metaAdsLibraryUrl.trim();
                        if (!v) return;
                        const canon = canonicalMetaAdsLibraryUrl(v);
                        if (canon && canon !== v) {
                          patchCompanyScrape({ metaAdsLibraryUrl: canon });
                        }
                      }}
                      className={`${workspaceAdProfileInputClass} w-full`}
                    />
                    {workspaceMetaInputError ? (
                      <p className="text-[10px] font-semibold leading-snug text-red-700">{workspaceMetaInputError}</p>
                    ) : null}
                  </div>
                ) : null}

                {workspaceChannelSet.has("google") ? (
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-800">
                        <GoogleLogo className="size-3.5 shrink-0" />
                        Google Transparency domain
                      </div>
                      <a
                        href={buildGoogleTransparencyPreviewUrl(companyScrape.googleAdsDomain, workspaceSiteHostNoWww)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Preview in new tab"
                        className={onboardingLibraryPreviewLinkClass}
                      >
                        <ExternalLink className="size-3 shrink-0 opacity-75" aria-hidden />
                        Preview
                      </a>
                    </div>
                    <input
                      type="text"
                      placeholder="yoursite.com"
                      value={companyScrape.googleAdsDomain}
                      spellCheck={false}
                      onChange={(e) => patchCompanyScrape({ googleAdsDomain: e.target.value })}
                      className={`${workspaceAdProfileInputClass} w-full font-mono`}
                      autoComplete="off"
                    />
                  </div>
                ) : null}

                {workspaceChannelSet.has("linkedin") ? (
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-800">
                        <LinkedInLogo className="size-3.5 shrink-0" />
                        LinkedIn Ads Library URL
                      </div>
                      <a
                        href={buildLinkedInAdLibraryPreviewUrl(companyScrape.linkedInUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Preview in new tab"
                        className={onboardingLibraryPreviewLinkClass}
                      >
                        <ExternalLink className="size-3 shrink-0 opacity-75" aria-hidden />
                        Preview
                      </a>
                    </div>
                    <p className="text-[10px] leading-snug text-gray-500">
                      Link from&nbsp;
                      <span className="font-semibold text-gray-700">linkedin.com/ad-library</span>
                      &nbsp;(advertiser disclosure), not a profile URL.
                    </p>
                    <input
                      type="text"
                      placeholder="Ad Library advertiser URL"
                      value={companyScrape.linkedInUrl}
                      spellCheck={false}
                      onChange={(e) => patchCompanyScrape({ linkedInUrl: e.target.value })}
                      onBlur={() => {
                        const v = companyScrape.linkedInUrl.trim();
                        if (!v) return;
                        const canon = canonicalLinkedInAdLibraryUrl(v);
                        if (canon && canon !== v) {
                          patchCompanyScrape({ linkedInUrl: canon });
                        }
                      }}
                      className={`${workspaceAdProfileInputClass} w-full`}
                    />
                    {workspaceLinkedInWarning ? (
                      <p className="text-[10px] font-semibold leading-snug text-amber-900/90">{workspaceLinkedInWarning}</p>
                    ) : null}
                  </div>
                ) : null}

                {workspaceChannelSet.has("tiktok") ? (
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-800">
                        <TikTokLogo className="size-3.5 shrink-0" />
                        TikTok Ads Library keyword
                      </div>
                      <a
                        href={buildTikTokAdsLibraryPreviewUrl(
                          companyScrape.tiktokKeyword.trim() ||
                            workspaceAutoKeywordSlug ||
                            workspaceSiteHostNoWww ||
                            undefined,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Preview in new tab"
                        className={onboardingLibraryPreviewLinkClass}
                      >
                        <ExternalLink className="size-3 shrink-0 opacity-75" aria-hidden />
                        Preview
                      </a>
                    </div>
                    <input
                      type="text"
                      placeholder="Brand name or @handle"
                      value={companyScrape.tiktokKeyword}
                      spellCheck={false}
                      onChange={(e) => patchCompanyScrape({ tiktokKeyword: e.target.value })}
                      className={`${workspaceAdProfileInputClass} w-full`}
                    />
                  </div>
                ) : null}

                {workspaceChannelSet.has("snapchat") ? (
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-800">
                        <SnapchatLogo className="size-3.5 shrink-0" />
                        Snapchat Ads keyword
                      </div>
                      <a
                        href={buildSnapchatAdsGalleryPreviewUrl(
                          companyScrape.snapchatKeyword.trim() || workspaceAutoKeywordSlug || undefined,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Preview in new tab"
                        className={onboardingLibraryPreviewLinkClass}
                      >
                        <ExternalLink className="size-3 shrink-0 opacity-75" aria-hidden />
                        Preview
                      </a>
                    </div>
                    <input
                      type="text"
                      placeholder="@username or keyword"
                      value={companyScrape.snapchatKeyword}
                      spellCheck={false}
                      onChange={(e) => patchCompanyScrape({ snapchatKeyword: e.target.value })}
                      className={`${workspaceAdProfileInputClass} w-full`}
                    />
                  </div>
                ) : null}

                {workspaceChannelSet.has("pinterest") ? (
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-800">
                        <PinterestLogo className="size-3.5 shrink-0" />
                        Pinterest Ads keyword
                      </div>
                      <a
                        href={buildPinterestAdsPreviewUrl(
                          `${companyScrape.pinterestKeyword}`.trim() ||
                            workspaceAutoKeywordSlug ||
                            workspaceSiteHostNoWww ||
                            "",
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Preview in new tab"
                        className={onboardingLibraryPreviewLinkClass}
                      >
                        <ExternalLink className="size-3 shrink-0 opacity-75" aria-hidden />
                        Preview
                      </a>
                    </div>
                    <input
                      type="text"
                      placeholder="Username or keyword"
                      value={companyScrape.pinterestKeyword}
                      spellCheck={false}
                      onChange={(e) => patchCompanyScrape({ pinterestKeyword: e.target.value })}
                      className={`${workspaceAdProfileInputClass} w-full`}
                    />
                  </div>
                ) : null}

                <p className="rounded-lg border border-white/55 bg-white/40 px-2 py-1.5 text-[11px] text-gray-600 backdrop-blur-sm">
                  Matching these fingerprints is what unlocks scraping your brand&apos;s own ads—not just competitor
                  pages.&nbsp;You can refine them anytime from dashboard competitor settings.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse sm:justify-stretch">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep(STEP_RIVAL_MARKETS);
                }}
                disabled={saving}
                className="w-full rounded-full bg-gray-900 py-3.5 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:flex-1"
              >
                Add rivals (optional) →
              </button>
              <button
                type="button"
                onClick={() => void finish()}
                disabled={saving}
                className="w-full rounded-full border border-gray-300/90 bg-white/70 py-3.5 text-[14px] font-semibold text-gray-900 shadow-sm transition hover:bg-white sm:flex-1"
              >
                {saving ? "Finishing…" : "Finish without rivals"}
              </button>
            </div>
          </>
        ) : null}

        {step === STEP_RIVAL_MARKETS ? (
          <>
            <div className="mb-5">
              <h1 className="text-[21px] font-semibold tracking-tight text-gray-900">Rivals &amp; regions</h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
                Pick where to look for ads. You&apos;ll confirm social URLs on the next screen.
              </p>
            </div>

            {competitorEnrichmentLoading && selectedCompetitors.length > 0 ? (
              <p className="mb-2 flex items-center gap-1.5 text-[11px] text-gray-500">
                <Loader2 className="size-3 shrink-0 animate-spin text-emerald-700/70 motion-reduce:animate-none" />
                Scanning competitor homepages…
              </p>
            ) : null}

            {selectedCompetitors.length > 0 ? (
              <div className="mb-4 overflow-hidden rounded-lg border border-emerald-200/80 bg-emerald-50/40">
                <ul className="divide-y divide-emerald-200/50">
                  {selectedCompetitors.map((d) => {
                    const picked = competitorAdMarkets[d] ?? [];
                    const summaryOnly = picked.length > 0 && adMarketsExpandedFor !== d;

                    return (
                      <li key={`detail-${d}`} className="px-2 py-2 sm:px-2.5">
                        <div className="flex items-start gap-2">
                          <DomainFavicon domain={d} className="size-6 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="break-all text-[12px] font-semibold text-gray-900">{d}</span>
                              <button
                                type="button"
                                onClick={() => toggleCompetitor(d)}
                                className="ms-auto shrink-0 rounded p-0.5 text-[13px] leading-none text-gray-400 hover:bg-black/5 hover:text-gray-700"
                                aria-label={`Remove ${d}`}
                              >
                                ×
                              </button>
                            </div>

                            {summaryOnly ? (
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <MarketCodesSummary codes={picked} />
                                <button
                                  type="button"
                                  onClick={() => setAdMarketsExpandedFor(d)}
                                  className="text-[10px] font-semibold text-gray-900 underline decoration-gray-300 underline-offset-2"
                                >
                                  Change regions
                                </button>
                              </div>
                            ) : (
                              <div className="mt-1.5 space-y-1">
                                {picked.length === 0 ? (
                                  <p className="text-[10px] text-amber-900/85">Pick at least one region.</p>
                                ) : null}
                                <AdMarketChips
                                  selectedCodes={picked}
                                  onToggle={(code) => toggleCompetitorAdMarket(d, code)}
                                />
                                {picked.length > 0 && adMarketsExpandedFor === d ? (
                                  <div className="flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => setAdMarketsExpandedFor(null)}
                                      className="text-[10px] font-semibold text-gray-500 hover:text-gray-900"
                                    >
                                      Done
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="border-t border-emerald-200/50 px-2 py-1.5 text-[10px] text-emerald-900/70">
                  {unionAdMarketCodes.length} region{unionAdMarketCodes.length === 1 ? "" : "s"} total
                </p>
              </div>
            ) : null}

            <div className="mb-2">
              <label htmlFor="onb-manual-comp" className="mb-1 block text-[12px] font-semibold text-gray-800">
                Add rival
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {manualCompetitor.trim() && isPlausiblePublicHostname(normalizedWorkspaceHost(manualCompetitor)) ? (
                    <DomainFavicon domain={normalizedWorkspaceHost(manualCompetitor)} className="size-9" />
                  ) : (
                    <div className="size-9 shrink-0 rounded-lg border border-dashed border-gray-300/80 bg-gray-50/80" />
                  )}
                  <input
                    id="onb-manual-comp"
                    type="text"
                    placeholder="competitor.com"
                    value={manualCompetitor}
                    spellCheck={false}
                    enterKeyHint="done"
                    maxLength={MAX_COMPANY_INPUT_CHARS}
                    onChange={(e) =>
                      setManualCompetitor(sanitizeCompanyUrlInput(e.target.value))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void addManualCompetitor();
                      }
                    }}
                    className={`${glassInputClass} min-w-0 flex-1`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void addManualCompetitor()}
                  disabled={
                    selectedCompetitors.length >= MAX_ONBOARDING_COMPETITORS || saving
                  }
                  className="shrink-0 rounded-full bg-white/55 px-4 py-2.5 text-[13px] font-semibold text-gray-900 ring-1 ring-white/70 backdrop-blur-sm transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-gray-500">
                Optional · {selectedCompetitors.length}/{MAX_ONBOARDING_COMPETITORS}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep(STEP_RIVAL_SCRAPE);
              }}
              disabled={saving || !step2MarketsComplete}
              className="mt-5 w-full rounded-full bg-gray-900 py-3.5 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              Continue →
            </button>
          </>
        ) : null}

        {step === STEP_RIVAL_SCRAPE ? (
          <>
            <div className="mb-5">
              <h1 className="text-[21px] font-semibold tracking-tight text-gray-900">Ad sources</h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
                These power social and search ad discovery. We pre-fill what we find on each competitor&apos;s
                homepage—edit anything that looks off.
              </p>
            </div>

            {selectedCompetitors.length === 0 ? (
              <p className="mb-4 rounded-xl border border-gray-200/80 bg-gray-50/60 px-3 py-2.5 text-[13px] text-gray-700">
                You didn&apos;t add rivals—that&apos;s fine. Your workspace ad settings stay as you set them earlier.
              </p>
            ) : (
              <div className="mb-4 space-y-4">
                {selectedCompetitors.map((d) => {
                  const row = competitorScrapeInputs[d] ?? emptyScrapeRow(d);
                  const suf = `scrape_${d.replace(/[^a-z0-9]+/gi, "_")}`;
                  return (
                    <div
                      key={`scrape-${d}`}
                      className="rounded-xl border border-gray-200/80 bg-white/55 px-3 py-3 shadow-sm"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <DomainFavicon domain={d} className="size-8 shrink-0" />
                        <span className="min-w-0 break-all text-[13px] font-semibold text-gray-900">{d}</span>
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-gray-800">
                            <Link2 className="size-3.5 shrink-0 text-gray-500" aria-hidden />
                            Website
                          </div>
                          <input
                            type="text"
                            value={row.websiteUrl}
                            spellCheck={false}
                            onChange={(e) => patchCompetitorScrape(d, { websiteUrl: e.target.value })}
                            className={`${glassInputClass} mt-0.5 w-full text-[13px]`}
                            autoComplete="url"
                          />
                        </div>

                        <div>
                          <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-gray-800">
                            <FacebookLogo idSuffix={`${suf}_fb`} className="size-3.5 shrink-0" />
                            Facebook page
                          </div>
                          <input
                            type="text"
                            placeholder="https://www.facebook.com/…"
                            value={row.facebookUrl}
                            spellCheck={false}
                            onChange={(e) => patchCompetitorScrape(d, { facebookUrl: e.target.value })}
                            className={`${glassInputClass} mt-0.5 w-full text-[13px]`}
                          />
                        </div>

                        <div>
                          <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-gray-800">
                            <InstagramMark className="size-3.5 shrink-0" />
                            Instagram
                          </div>
                          <input
                            type="text"
                            placeholder="Profile URL"
                            value={row.instagramUrl}
                            spellCheck={false}
                            onChange={(e) => patchCompetitorScrape(d, { instagramUrl: e.target.value })}
                            className={`${glassInputClass} mt-0.5 w-full text-[13px]`}
                          />
                        </div>

                        <div>
                          <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-gray-800">
                            <TikTokMark className="size-3.5 shrink-0 text-gray-900" />
                            TikTok
                          </div>
                          <input
                            type="text"
                            placeholder="https://www.tiktok.com/@…"
                            value={row.tikTokUrl}
                            spellCheck={false}
                            onChange={(e) => patchCompetitorScrape(d, { tikTokUrl: e.target.value })}
                            className={`${glassInputClass} mt-0.5 w-full text-[13px]`}
                          />
                        </div>

                        <div>
                          <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-gray-800">
                            <LinkedInMark className="size-3.5 shrink-0" />
                            LinkedIn company
                          </div>
                          <input
                            type="text"
                            placeholder="Company page URL (LinkedIn Ads)"
                            value={row.linkedInUrl}
                            spellCheck={false}
                            onChange={(e) => patchCompetitorScrape(d, { linkedInUrl: e.target.value })}
                            className={`${glassInputClass} mt-0.5 w-full text-[13px]`}
                          />
                        </div>

                        <div>
                          <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-gray-800">
                            <SocialProfileIcon
                              href="https://www.youtube.com/"
                              className="size-3.5 shrink-0 text-red-600"
                            />
                            YouTube
                          </div>
                          <input
                            type="text"
                            placeholder="Channel or @handle URL"
                            value={row.youTubeUrl}
                            spellCheck={false}
                            onChange={(e) => patchCompetitorScrape(d, { youTubeUrl: e.target.value })}
                            className={`${glassInputClass} mt-0.5 w-full text-[13px]`}
                          />
                        </div>

                        <div>
                          <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-gray-800">
                            <SocialProfileIcon
                              href="https://www.snapchat.com/add"
                              className="size-3.5 shrink-0"
                            />
                            Snapchat keyword
                          </div>
                          <input
                            type="text"
                            placeholder="Brand or @username for Snap Ads Library"
                            value={row.snapchatKeyword}
                            spellCheck={false}
                            onChange={(e) => patchCompetitorScrape(d, { snapchatKeyword: e.target.value })}
                            className={`${glassInputClass} mt-0.5 w-full text-[13px]`}
                          />
                        </div>

                        <p className="rounded-lg bg-gray-50/90 px-2 py-1.5 text-[11px] text-gray-600">
                          <span className="font-semibold text-gray-800">Google Ads</span> uses this domain:{" "}
                          <span className="font-mono text-[11px] text-gray-800">{d}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => void finish()}
              disabled={saving}
              className="mt-5 w-full rounded-full bg-gray-900 py-3.5 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              {saving ? "Setting up…" : "Get started →"}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

