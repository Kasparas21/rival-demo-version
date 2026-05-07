"use client";

import { Building2, Link2, Loader2 } from "lucide-react";
import { FacebookLogo } from "@/components/icons/facebook-logo";
import { InstagramMark } from "@/components/icons/instagram-mark";
import { LinkedInMark } from "@/components/icons/linkedin-mark";
import { TikTokMark } from "@/components/icons/tiktok-mark";
import { SocialProfileIcon } from "@/components/onboarding/social-profile-icon";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { glassInputClass } from "@/components/ui/glass-styles";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
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
} from "@/lib/onboarding/ad-markets";
import { socialNetworkBucket } from "@/lib/onboarding/social-profile-utils";

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
}: {
  selectedCodes: string[];
  onToggle: (code: string) => void;
}) {
  return (
    <div className="relative -mx-1">
      <div
        className="flex max-w-full flex-nowrap gap-1 overflow-x-auto overscroll-x-contain scroll-smooth rounded-lg border border-gray-200/70 bg-white/60 px-2 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Ad markets"
      >
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
                  ? "border-gray-900/35 bg-gray-900 text-white shadow-sm"
                  : "border-gray-200/95 bg-white/80 text-gray-600 hover:bg-white hover:text-gray-900"
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

export function OnboardingForm({ userId, postOnboardingPath = "/dashboard", initialData }: Props) {
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
  const socialEnrichmentSigRef = useRef<Record<string, string>>({});

  const unionAdMarketCodes = useMemo(() => {
    if (selectedCompetitors.length === 0) return [...DEFAULT_ONBOARDING_AD_MARKETS];
    const u = new Set<string>();
    for (const h of selectedCompetitors) {
      for (const c of competitorAdMarkets[h] ?? []) u.add(c);
    }
    return [...u];
  }, [selectedCompetitors, competitorAdMarkets]);



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

  const step2MarketsComplete = useMemo(() => {
    if (selectedCompetitors.length === 0) return true;
    return selectedCompetitors.every((h) => (competitorAdMarkets[h] ?? []).length > 0);
  }, [selectedCompetitors, competitorAdMarkets]);

  const handleCompanyChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setCompanyUrl(sanitizeCompanyUrlInput(e.target.value));
  }, []);

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
    if (step !== 2 && step !== 3) return;

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
    if (step !== 2 && step !== 3) return;
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

      if (hosts.length > 0) {
        for (const h of hosts) {
          const codes = competitorAdMarkets[h] ?? [];
          if (codes.length === 0) {
            setError(`Choose at least one ad market for ${h}.`);
            return;
          }
        }
      }

      const resolvedAdMarketCodes = [...unionAdMarketCodes].sort();

      const primaryName =
        (brandInsights?.brandName?.trim() && brandInsights.brandName.trim()) || hostToBrandLabel(companyHost);
      const logoFromInsights = brandInsights?.logoUrl?.trim() || null;

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

      const { error: brandError } = await supabase
        .from("brands")
        .update({
          name: primaryName,
          domain: companyHost,
          brand_context: brandInsights?.description?.trim() || null,
          ...(logoFromInsights &&
          !logoFromInsights.includes("google.com/s2/favicons")
            ? { logo_url: logoFromInsights }
            : {}),
        })
        .eq("user_id", userId)
        .eq("is_primary", true);

      if (brandError) {
        setError(brandError.message);
        return;
      }

      if (hosts.length > 0) {
        const competitors = hosts.map((domain) => {
          const label = hostToBrandLabel(domain);
          return {
            slug: domain,
            name: label,
            pending: false,
            brand: { name: label, domain },
          };
        });

        try {
          const res = await fetch("/api/account/saved-competitors", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ competitors }),
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
            setError(typeof msg === "string" ? msg : "Could not save competitors.");
            return;
          }
        } catch {
          setError("Could not reach the server to save competitors.");
          return;
        }
      }

      try {
      const hintPayload = {
          v: 3,
          ts: Date.now(),
          workspaceDomain: companyHost,
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
        sessionStorage.setItem(`rival.onboarding_hints.v1.${userId}`, JSON.stringify(hintPayload));
        try {
          localStorage.setItem(
            "rival.ad_markets.v1",
            JSON.stringify({
              codes: resolvedAdMarketCodes,
              updatedAt: Date.now(),
            })
          );
        } catch {
          /* non-fatal */
        }
      } catch {
        /* non-fatal */
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

  const stepLabels = ["Website", "Your brand"];
  const totalSteps = 2;

  const goBack = () => {
    if (saving) return;
    setError(null);
    if (step === 1) setStep(0);
  };

  return (
    <div className="w-full rounded-[28px] border border-white/60 bg-white/40 px-7 py-9 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md transition-all duration-300 sm:px-10 sm:py-10">
      <div className="mb-5 flex items-center justify-between gap-2 sm:mb-6">
        <div className="flex min-w-0 shrink-0 items-center">
          {step > 0 ? (
            <button
              type="button"
              disabled={(step === 1 && brandLoading) || saving}
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
            {[0, 1].map((i) => (
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

                {brandInsights.socials.length > 0 ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-gray-500">Social</p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {brandInsights.socials.map((s) => (
                        <li key={s.href}>
                          <a
                            href={s.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-[min(100%,18rem)] items-center gap-2 rounded-full border border-white/60 bg-white/40 px-2.5 py-1.5 text-[12px] font-semibold text-gray-800 backdrop-blur-sm transition hover:bg-white/65"
                            title={s.label}
                          >
                            <SocialProfileIcon href={s.href} className="size-4 shrink-0" />
                            <span className="truncate">{s.handle ?? s.label}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-[14px] font-medium text-gray-600">Nothing loaded — go back or continue.</p>
            )}

            <button
              type="button"
              onClick={() => void finish()}
              disabled={brandLoading || saving}
              className="mt-6 w-full rounded-full bg-gray-900 py-3.5 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              {saving ? "Finishing…" : "Finish setup →"}
            </button>
          </>
        ) : null}

        {step === 2 ? (
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
                setStep(3);
              }}
              disabled={saving || !step2MarketsComplete}
              className="mt-5 w-full rounded-full bg-gray-900 py-3.5 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              Continue →
            </button>
          </>
        ) : null}

        {step === 3 ? (
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
                You didn&apos;t add rivals. That&apos;s fine—your own brand settings from the earlier step still apply.
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
