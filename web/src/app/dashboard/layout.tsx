"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { LogOut, Search, ChevronDown, ChevronsLeft, ChevronsRight, Plus, Settings, Trash2, Compass, Bookmark } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BrandProvider, type Brand } from "./brand-context";
import { CompetitorLogo } from "@/components/shared/competitor-logo";
import { parseAdsProfileSetup } from "@/lib/onboarding/workspace-ads-setup";
import { RivalLogoImg } from "@/components/rival-logo";
import { RivalLoadingBlock } from "@/components/ui/rival-loading";
import { SidebarRivalAgentControl } from "@/components/agent/SidebarRivalAgentControl";
import { SidebarCompetitorAvatar } from "@/components/sidebar-competitor-avatar";
import { SidebarCompetitorSkeleton } from "@/components/sidebar-competitor-skeleton";
import { limitsForTier, tierAllowsMultipleBrandWorkspaces, type PlanTier } from "@/lib/billing/plan-limits";
import { NEW_BRAND_ONBOARDING_PATH } from "@/lib/onboarding/phase";
import { buildUpgradeToAgencyHref } from "@/lib/billing/checkout-url";
import {
  buildCompetitorSidebarHref,
  clearSidebarCompetitorsForBrand,
  clearSidebarCompetitorsStorageForSignOut,
  coerceSidebarCompetitorUrlHost,
  competitorSidebarShowsLoadingSkeleton,
  dedupeSidebarCompetitors,
  ensureSidebarStorageBelongsToUser,
  loadSidebarCompetitors,
  mergeAccountSidebarRowsWithLocalLibraryContext,
  normalizeCompetitorSlug,
  purgeExcludedSidebarCompetitorRows,
  removeSidebarCompetitor,
  saveSidebarCompetitors,
  sidebarCompetitorsWithoutWorkspaceRow,
  setWorkspaceDomainForCompetitorCap,
  SIDEBAR_COMPETITORS_EVENT,
  SIDEBAR_COMPETITORS_STORAGE_KEY,
  suppressSidebarUpsertAfterRemoval,
  WORKSPACE_BRAND_PLACEHOLDER_SLUG,
  type SidebarCompetitor,
} from "@/lib/sidebar-competitors";
import {
  CLIENT_PLAN_CAP_EVENT,
  clearClientCompetitorSlotUsage,
  fetchDashboardBillingSnapshot,
  readClientGlobalCompetitorsUsed,
  readClientMaxWatchedCompetitors,
} from "@/lib/billing/client-plan-cap";
import {
  buildCompetitorDashboardPath,
  competitorHostFromDashboardPathname,
} from "@/lib/competitor-dashboard-url";
import { isGenericDashboardLanding } from "@/lib/dashboard/default-home";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  deleteSavedCompetitorFromAccount,
  fetchSavedCompetitorsFromAccount,
} from "@/lib/account/client";
import { collectAdsCacheDomainVariantsForSavedCompetitorRow } from "@/lib/ad-library/competitor-cache-domain";
import { clearAdsLibraryClientCachesForBrandDomains } from "@/lib/ad-library/deduped-fetch";
import { RIVAL_BRANDS_UPDATED_EVENT, RIVAL_PROFILE_UPDATED_EVENT } from "@/lib/account/profile-events";
import { PostOnboardingPricingOverlay } from "@/components/billing/post-onboarding-pricing-overlay";
import { PricingGateDashboardMock } from "@/components/billing/pricing-gate-dashboard-mock";
import { SaveAdModalProvider } from "@/components/saved-ads/save-ad-modal-context";
import { ScrapePausedBanner } from "@/components/dashboard/scrape-paused-banner";
import { RecentPlatformRefreshNotice } from "@/components/dashboard/recent-platform-refresh-notice";
import { Toaster } from "sonner";
import {
  DemoCompetitorYellowDot,
  DEMO_MARKED_COMPETITOR_TITLE,
} from "@/components/dashboard/demo-hidden-competitor-sidebar-row";
import {
  shouldHideDemoMarkedSidebarCompetitor,
  shouldShowDemoMarkedCompetitorDot,
} from "@/lib/debug/demo-sidebar-competitors";
import { DemoSidebarLink } from "@/components/demo/demo-sidebar-link";
import {
  buildDashboardDemoCompetitorPath,
  demoHostFromDashboardPathname,
  DEMO_OWN_BRAND,
  getDemoSidebarCompetitors,
  isDashboardDemoPath,
} from "@/lib/demo/dashboard-demo-config";

const FIRST_RUN_WELCOME_DISMISSED_KEY = "rival_first_run_welcome_dismissed";

function RemoveWatchedCompetitorDialog({
  competitor,
  onDismiss,
  onConfirmRemove,
}: {
  competitor: SidebarCompetitor;
  onDismiss: () => void;
  onConfirmRemove: () => void;
}) {
  const host = coerceSidebarCompetitorUrlHost(competitor);
  const label = competitor.name?.trim() || host || competitor.slug;
  const domainLabel = host.trim() || "this domain";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10 sm:items-center sm:justify-center sm:pb-4 sm:pt-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#0f0f12]/45 backdrop-blur-[3px] motion-reduce:backdrop-blur-none"
        aria-label="Cancel"
        onClick={onDismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-watched-competitor-title"
        className="relative z-[1] w-full max-w-[400px] rounded-2xl border border-[#e8e8e8]/95 bg-white p-6 shadow-[0_24px_80px_rgba(31,38,135,0.15)]"
      >
        <p
          id="remove-watched-competitor-title"
          className="text-[17px] font-semibold leading-snug tracking-tight text-[#1a1a2e]"
        >
          Remove &ldquo;{label}&rdquo;?
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-[#52525b]">
          This removes <span className="font-medium text-[#3f3f46]">{domainLabel}</span> from this brand&apos;s
          competitor list. Existing scraped ads and analysis stay available if you add this competitor to a brand again.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="w-full rounded-xl border border-[#e4e4e7] bg-white px-4 py-2.5 text-[14px] font-medium text-[#3f3f46] outline-none transition-colors hover:bg-[#fafafa] hover:text-[#18181b] focus-visible:ring-2 focus-visible:ring-[color:var(--rival-accent-blue)]/40 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmRemove();
            }}
            className="w-full rounded-xl bg-[#b42318] px-4 py-2.5 text-[14px] font-medium text-white outline-none transition-colors hover:bg-[#9a1d14] focus-visible:ring-2 focus-visible:ring-[#b42318]/50 focus-visible:ring-offset-2 sm:w-auto"
          >
            Remove competitor
          </button>
        </div>
      </div>
    </div>
  );
}

function BrandWorkspaceLimitDialog({
  variant,
  onDismiss,
}: {
  variant: "trial" | "upgrade_agency" | "plan_cap";
  onDismiss: () => void;
}) {
  const isTrial = variant === "trial";
  const isAgencyUpsell = variant === "upgrade_agency";
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10 sm:items-center sm:justify-center sm:pb-4 sm:pt-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#0f0f12]/45 backdrop-blur-[3px] motion-reduce:backdrop-blur-none"
        aria-label="Close"
        onClick={onDismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="brand-workspace-limit-title"
        className="relative z-[1] w-full max-w-[400px] rounded-2xl border border-[#e8e8e8]/95 bg-white p-6 shadow-[0_24px_80px_rgba(31,38,135,0.15)]"
      >
        <p
          id="brand-workspace-limit-title"
          className="text-[17px] font-semibold leading-snug tracking-tight text-[#1a1a2e]"
        >
          {isAgencyUpsell
            ? "Multi-brand workspaces are on the Agency plan"
            : isTrial
              ? "Another brand workspace isn’t available on free trial"
              : "Brand workspace limit reached"}
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-[#52525b]">
          {isAgencyUpsell
            ? "Manage up to 5 client brands, each with its own competitor list and workspace. Upgrade to Agency to add another brand."
            : isTrial
              ? "Your free trial includes one own-brand workspace. Upgrade to Agency to manage multiple client brands with separate competitor lists."
              : "You’ve reached the maximum number of brand workspaces on your Agency plan."}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="w-full rounded-xl border border-[#e4e4e7] bg-white px-4 py-2.5 text-[14px] font-medium text-[#3f3f46] outline-none transition-colors hover:bg-[#fafafa] sm:w-auto"
          >
            Got it
          </button>
          <Link
            href={isAgencyUpsell || isTrial ? buildUpgradeToAgencyHref() : "/checkout"}
            className="flex w-full items-center justify-center rounded-xl bg-[#1a1a2e] px-4 py-2.5 text-center text-[14px] font-medium text-white transition-colors hover:bg-[#2d2d44] sm:w-auto"
            onClick={onDismiss}
          >
            {isAgencyUpsell || isTrial ? "Upgrade to Agency" : "View plans"}
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * True when the URL `/dashboard/competitor/<host>` refers to this sidebar row.
 * Path-normalization and stored slug/domain can diverge (e.g. brand domain vs keyword slug).
 */
function competitorRowMatchesActivePath(
  competitor: SidebarCompetitor,
  activeHostOrSlug: string,
  rowSlugNav: string
): boolean {
  if (!activeHostOrSlug.trim()) return false;
  const active = normalizeCompetitorSlug(activeHostOrSlug);
  if (!active) return false;
  const hints = [
    rowSlugNav,
    coerceSidebarCompetitorUrlHost(competitor),
    competitor.slug,
    competitor.brand?.domain,
  ]
    .filter((x): x is string => Boolean(x?.trim()))
    .map((x) => normalizeCompetitorSlug(x));
  return hints.some((h) => h === active);
}

function mapApiBrandRow(row: {
  id: string;
  name: string;
  domain?: string | null;
  logo_url?: string | null;
  color?: string | null;
  brand_context?: string | null;
  ads_profile_setup?: unknown | null;
}): Brand {
  const name = row.name?.trim() || "Brand";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const badge = initials.length > 0 ? initials.slice(0, 2) : name.slice(0, 2).toUpperCase() || "B";
  const ctx = row.brand_context?.trim();
  const dom = row.domain?.trim();
  const adsSetup = parseAdsProfileSetup(row.ads_profile_setup ?? null);
  return {
    id: row.id,
    name,
    badge,
    logoUrl: row.logo_url?.trim() || undefined,
    color: row.color?.trim() || "#343434",
    ...(dom ? { domain: dom } : {}),
    ...(ctx ? { brandContext: ctx } : {}),
    ...(adsSetup ? { adsSetup } : {}),
  };
}

function withoutOwnedBrandRows(
  competitors: SidebarCompetitor[],
  brands: Brand[],
  activeWorkspaceDomain?: string | null,
): SidebarCompetitor[] {
  const domains = [
    activeWorkspaceDomain,
    ...brands.map((brand) => brand.domain).filter((domain): domain is string => Boolean(domain?.trim())),
  ];
  return domains.reduce(
    (rows, domain) => sidebarCompetitorsWithoutWorkspaceRow(rows, domain),
    competitors,
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsLoaded, setBrandsLoaded] = useState(false);
  const [activeBrandId, setActiveBrandId] = useState("");
  const [isBrandMenuOpen, setIsBrandMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [savedCompetitors, setSavedCompetitors] = useState<SidebarCompetitor[]>([]);
  const [userProfile, setUserProfile] = useState<{
    full_name?: string | null;
    company_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  } | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [competitorRemoveError, setCompetitorRemoveError] = useState<string | null>(null);
  const [removingCompetitorSlug, setRemovingCompetitorSlug] = useState<string | null>(null);
  const [brandRemoveError, setBrandRemoveError] = useState<string | null>(null);
  const [removingBrandId, setRemovingBrandId] = useState<string | null>(null);
  const [removeCompetitorDialog, setRemoveCompetitorDialog] = useState<{
    competitor: SidebarCompetitor;
    rowSlugNav: string;
  } | null>(null);
  const [maxWatchedCompetitorsCap, setMaxWatchedCompetitorsCap] = useState(
    limitsForTier("free_trial").maxWatchedCompetitors,
  );
  const [globalCompetitorsUsed, setGlobalCompetitorsUsed] = useState<number | null>(null);
  const [billingPlanTier, setBillingPlanTier] = useState<PlanTier>("free_trial");
  const [maxOwnBrandWorkspaces, setMaxOwnBrandWorkspacesState] = useState(
    limitsForTier("free_trial").maxOwnBrandWorkspaces,
  );
  const [brandWorkspaceLimitDialog, setBrandWorkspaceLimitDialog] = useState<
    "trial" | "upgrade_agency" | "plan_cap" | null
  >(null);

  const refreshSavedCompetitors = useCallback(() => {
    const activeId =
      activeBrandId ||
      (typeof window !== "undefined"
        ? window.localStorage.getItem("rival_active_brand") ??
          window.localStorage.getItem("rival_active_workspace") ??
          ""
        : "");
    if (!activeId || activeId === "default" || activeId === "_workspace") {
      setSavedCompetitors([]);
      return;
    }
    localStorage.setItem("rival_active_brand", activeId);
    setSavedCompetitors(loadSidebarCompetitors());
  }, [activeBrandId]);

  const refreshBillingUsage = useCallback(() => {
    void fetchDashboardBillingSnapshot().then((snap) => {
      if (!snap) return;
      setBillingPlanTier(snap.planTier);
      setMaxOwnBrandWorkspacesState(snap.maxOwnBrandWorkspaces);
      setMaxWatchedCompetitorsCap(snap.maxWatchedCompetitors);
      setGlobalCompetitorsUsed(snap.competitorsWatched);
    });
  }, []);

  const hydrateDashboardPrefs = useCallback(() => {
    const storedActive =
      window.localStorage.getItem("rival_active_brand") ??
      window.localStorage.getItem("rival_active_workspace");
    if (storedActive) {
      setActiveBrandId(storedActive);
    }

    setSidebarCollapsed(window.localStorage.getItem("rival_sidebar_collapsed") === "true");
  }, []);

  useEffect(() => {
    refreshSavedCompetitors();
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === SIDEBAR_COMPETITORS_STORAGE_KEY ||
        e.key?.startsWith(`${SIDEBAR_COMPETITORS_STORAGE_KEY}:`)
      ) {
        refreshSavedCompetitors();
      }
    };
    window.addEventListener(SIDEBAR_COMPETITORS_EVENT, refreshSavedCompetitors);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SIDEBAR_COMPETITORS_EVENT, refreshSavedCompetitors);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshSavedCompetitors]);

  useEffect(() => {
    void refreshBillingUsage();
    const onCap = () => {
      setMaxWatchedCompetitorsCap(readClientMaxWatchedCompetitors());
      setGlobalCompetitorsUsed(readClientGlobalCompetitorsUsed());
    };
    window.addEventListener(CLIENT_PLAN_CAP_EVENT, onCap);
    return () => window.removeEventListener(CLIENT_PLAN_CAP_EVENT, onCap);
  }, [refreshBillingUsage]);

  useEffect(() => {
    hydrateDashboardPrefs();
  }, [hydrateDashboardPrefs]);

  const refreshUserProfile = useCallback(() => {
    void fetch("/api/account/profile", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then(
        (d: {
          ok?: boolean;
          profile?: {
            full_name?: string | null;
            company_name?: string | null;
            email?: string | null;
            avatar_url?: string | null;
          };
        }) => {
          if (d.ok && d.profile) {
            setUserProfile(d.profile);
          }
        }
      );
  }, []);

  const refreshBrands = useCallback(() => {
    void fetch("/api/account/brands", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then(
        (d: {
          ok?: boolean;
          brands?: {
            id: string;
            name: string;
            domain?: string | null;
            logo_url?: string | null;
            color?: string | null;
            is_primary?: boolean;
            brand_context?: string | null;
            ads_profile_setup?: unknown | null;
          }[];
        }) => {
          if (!d.ok || !d.brands?.length) {
            setBrandsLoaded(true);
            return;
          }
          const mapped = d.brands.map(mapApiBrandRow);
          setBrands(mapped);
          setBrandsLoaded(true);
          const stored =
            typeof window !== "undefined"
              ? window.localStorage.getItem("rival_active_brand") ??
                window.localStorage.getItem("rival_active_workspace")
              : null;
          if (stored && mapped.some((b) => b.id === stored)) {
            setActiveBrandId(stored);
            return;
          }
          const primary = d.brands.find((b) => b.is_primary);
          const primaryMapped = primary ? mapApiBrandRow(primary) : mapped[0];
          if (primaryMapped) {
            setActiveBrandId(primaryMapped.id);
          }
        }
      );
  }, []);

  const goToBrandHub = useCallback(
    (brand: Brand) => {
      setIsBrandMenuOpen(false);
      if (isDashboardDemoPath(pathname)) {
        router.push(buildDashboardDemoCompetitorPath(DEMO_OWN_BRAND.domain), { scroll: false });
        return;
      }
      const domain = brand.domain?.trim();
      if (!domain) {
        const href = `${buildCompetitorDashboardPath(WORKSPACE_BRAND_PLACEHOLDER_SLUG)}?tab=ads%20library&sub=paid-media-settings`;
        router.push(href, { scroll: false });
        return;
      }
      const base = buildCompetitorDashboardPath(domain);
      const channels = brand.adsSetup?.channels;
      const q = new URLSearchParams();
      if (!channels?.length) {
        q.set("tab", "ads library");
        q.set("sub", "paid-media-settings");
      }
      if (channels?.length) {
        q.set("channels", channels.join(","));
        q.set("confirmed", "1");
      }
      const qs = q.toString();
      router.push(qs ? `${base}?${qs}` : base, { scroll: false });
    },
    [router, pathname],
  );

  const workspaceFallbackBrand: Brand = useMemo(() => {
    const cn = userProfile?.company_name?.trim();
    const email = userProfile?.email?.trim();
    const label = cn || "Your workspace";
    const badge =
      cn && cn.length > 0
        ? cn
            .split(/\s+/)
            .filter(Boolean)
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "?"
        : (email?.[0] ?? "?").toUpperCase();
    return { id: "_workspace", name: label, badge, color: "#343434" };
  }, [userProfile]);

  const activeBrand = useMemo(() => {
    const b = brands.find((x) => x.id === activeBrandId) ?? brands[0];
    if (b) return b;
    return workspaceFallbackBrand;
  }, [activeBrandId, brands, workspaceFallbackBrand]);

  const isOnDemoPath = isDashboardDemoPath(pathname);

  const effectiveBrand = useMemo((): Brand => {
    if (!isOnDemoPath) return activeBrand;
    return {
      id: "demo-own-brand",
      name: DEMO_OWN_BRAND.name,
      badge: DEMO_OWN_BRAND.initial,
      logoUrl: DEMO_OWN_BRAND.logoUrl,
      domain: DEMO_OWN_BRAND.domain,
      color: DEMO_OWN_BRAND.color,
    };
  }, [activeBrand, isOnDemoPath]);

  const previousActiveBrandIdRef = useRef<string | null>(null);

  const openBrandWorkspaceLimitDialog = useCallback(() => {
    if (tierAllowsMultipleBrandWorkspaces(billingPlanTier)) {
      setBrandWorkspaceLimitDialog("plan_cap");
      return;
    }
    setBrandWorkspaceLimitDialog(billingPlanTier === "free_trial" ? "trial" : "upgrade_agency");
  }, [billingPlanTier]);

  const handleAddBrand = useCallback(() => {
    if (!tierAllowsMultipleBrandWorkspaces(billingPlanTier)) {
      openBrandWorkspaceLimitDialog();
      return;
    }
    if (brands.length >= maxOwnBrandWorkspaces) {
      setBrandWorkspaceLimitDialog("plan_cap");
      return;
    }
    setIsBrandMenuOpen(false);
    router.push(NEW_BRAND_ONBOARDING_PATH);
  }, [
    billingPlanTier,
    brands.length,
    maxOwnBrandWorkspaces,
    openBrandWorkspaceLimitDialog,
    router,
  ]);

  const handleDeleteBrand = useCallback(
    async (brand: Brand) => {
      if (brands.length <= 1 || removingBrandId) return;
      const confirmed = window.confirm(`Delete "${brand.name}"? This removes the brand workspace, not saved ad data.`);
      if (!confirmed) return;

      setBrandRemoveError(null);
      setRemovingBrandId(brand.id);
      try {
        const res = await fetch("/api/account/brands", {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: brand.id }),
        });
        const json = (await res.json()) as { ok?: boolean; nextBrandId?: string | null; error?: string };
        if (!res.ok || !json.ok) {
          setBrandRemoveError(json.error ?? "Could not delete brand");
          return;
        }

        clearSidebarCompetitorsForBrand(brand.id);
        const remaining = brands.filter((b) => b.id !== brand.id);
        setBrands(remaining);
        refreshBillingUsage();

        if (activeBrandId === brand.id) {
          const next = remaining.find((b) => b.id === json.nextBrandId) ?? remaining[0];
          if (next) {
            setActiveBrandId(next.id);
            localStorage.setItem("rival_active_brand", next.id);
            goToBrandHub(next);
          }
        }
      } catch {
        setBrandRemoveError("Could not delete brand");
      } finally {
        setRemovingBrandId(null);
      }
    },
    [activeBrandId, brands, goToBrandHub, refreshBillingUsage, removingBrandId],
  );

  useEffect(() => {
    if (!brandsLoaded || brands.length === 0) return;
    const ws = activeBrand.domain?.trim() || null;
    setWorkspaceDomainForCompetitorCap(ws);
    if (purgeExcludedSidebarCompetitorRows(ws)) {
      queueMicrotask(refreshSavedCompetitors);
    }
  }, [activeBrand.domain, brands.length, brandsLoaded, refreshSavedCompetitors]);

  useEffect(() => {
    if (!brandsLoaded || brands.length === 0) return;
    if (!activeBrand.id) return;
    if (previousActiveBrandIdRef.current === null) {
      previousActiveBrandIdRef.current = activeBrand.id;
      return;
    }
    if (previousActiveBrandIdRef.current === activeBrand.id) return;
    previousActiveBrandIdRef.current = activeBrand.id;
    localStorage.setItem("rival_active_brand", activeBrand.id);
    queueMicrotask(refreshSavedCompetitors);
  }, [activeBrand.id, brands.length, brandsLoaded, refreshSavedCompetitors]);

  useEffect(() => {
    refreshUserProfile();
  }, [refreshUserProfile]);

  useEffect(() => {
    refreshBrands();
  }, [refreshBrands]);

  useEffect(() => {
    const sync = () => {
      refreshUserProfile();
      refreshBrands();
    };
    window.addEventListener(RIVAL_PROFILE_UPDATED_EVENT, sync);
    return () => window.removeEventListener(RIVAL_PROFILE_UPDATED_EVENT, sync);
  }, [refreshUserProfile, refreshBrands]);

  useEffect(() => {
    const onBrands = () => {
      refreshBrands();
      refreshBillingUsage();
    };
    window.addEventListener(RIVAL_BRANDS_UPDATED_EVENT, onBrands);
    return () => window.removeEventListener(RIVAL_BRANDS_UPDATED_EVENT, onBrands);
  }, [refreshBrands, refreshBillingUsage]);

  useEffect(() => {
    if (brands.length === 0) return;
    if (!activeBrandId || !brands.some((b) => b.id === activeBrandId)) {
      setActiveBrandId(brands[0].id);
    }
  }, [brands, activeBrandId]);

  useEffect(() => {
    if (brands.length <= 1) setIsBrandMenuOpen(false);
  }, [brands.length]);

  useEffect(() => {
    try {
      if (localStorage.getItem(FIRST_RUN_WELCOME_DISMISSED_KEY) === "1") {
        setShowWelcome(false);
        return;
      }
    } catch {
      /* ignore */
    }
    setShowWelcome(savedCompetitors.length === 0);
  }, [savedCompetitors]);

  const dismissFirstRunWelcome = useCallback(() => {
    try {
      localStorage.setItem(FIRST_RUN_WELCOME_DISMISSED_KEY, "1");
    } catch {
      /* ignore */
    }
    setShowWelcome(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncAccountCompetitors = async () => {
      if (!brandsLoaded || brands.length === 0) return;
      if (!activeBrand.id || activeBrand.id === "default" || activeBrand.id === "_workspace") return;
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      if (!uid) return;

      localStorage.setItem("rival_active_brand", activeBrand.id);
      ensureSidebarStorageBelongsToUser(uid);

      const workspaceDomain = activeBrand.domain?.trim() || null;
      purgeExcludedSidebarCompetitorRows(workspaceDomain);

      const localCompetitors = sidebarCompetitorsWithoutWorkspaceRow(
        loadSidebarCompetitors(),
        workspaceDomain,
      );
      const remoteCompetitors = await fetchSavedCompetitorsFromAccount(activeBrand.id);

      if (cancelled) return;

      if (remoteCompetitors.length > 0) {
        const visibleRemote = sidebarCompetitorsWithoutWorkspaceRow(
          remoteCompetitors as SidebarCompetitor[],
          workspaceDomain,
        );
        let merged = mergeAccountSidebarRowsWithLocalLibraryContext(visibleRemote, localCompetitors);
        merged = withoutOwnedBrandRows(merged, brands, workspaceDomain);
        saveSidebarCompetitors(merged);
        refreshSavedCompetitors();
        refreshBillingUsage();
        return;
      }

      saveSidebarCompetitors([]);
      refreshSavedCompetitors();
      refreshBillingUsage();
    };

    void syncAccountCompetitors();

    return () => {
      cancelled = true;
    };
  }, [refreshSavedCompetitors, refreshBillingUsage, activeBrand.domain, activeBrand.id, brands, brandsLoaded, supabase]);

  useEffect(() => {
    if (!brandsLoaded || brands.length === 0) return;
    const ws = activeBrand.domain?.trim() || null;
    const cur = loadSidebarCompetitors();
    const next = withoutOwnedBrandRows(cur, brands, ws);
    if (next.length === cur.length) return;
    saveSidebarCompetitors(next);
    queueMicrotask(refreshSavedCompetitors);
  }, [activeBrand.domain, brands, brandsLoaded, refreshSavedCompetitors]);

  useEffect(() => {
    if (!brandsLoaded) return;
    if (!activeBrandId) return;
    localStorage.setItem("rival_active_brand", activeBrandId);
    queueMicrotask(refreshSavedCompetitors);
  }, [activeBrandId, brandsLoaded, refreshSavedCompetitors]);

  useEffect(() => {
    localStorage.setItem("rival_sidebar_collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const demoOwnerEmail = userProfile?.email ?? null;
  const sidebarCompetitorRows = useMemo(() => {
    if (isOnDemoPath) return getDemoSidebarCompetitors();
    const deduped = dedupeSidebarCompetitors(savedCompetitors);
    const rows = withoutOwnedBrandRows(deduped, brands, activeBrand.domain);
    return rows.filter((competitor) => !shouldHideDemoMarkedSidebarCompetitor(demoOwnerEmail, competitor));
  }, [isOnDemoPath, savedCompetitors, brands, activeBrand.domain, demoOwnerEmail]);
  const pathCompetitorHost = isOnDemoPath
    ? demoHostFromDashboardPathname(pathname)
    : competitorHostFromDashboardPathname(pathname);
  const queryCompetitorHost = searchParams.get("url")?.trim();
  const pricingGate = searchParams.get("pricing") === "1";
  const activeCompetitorSlug =
    pathCompetitorHost || (queryCompetitorHost ? normalizeCompetitorSlug(queryCompetitorHost) : "");

  const canSwitchBrand = brands.length > 0;

  useEffect(() => {
    if (!removeCompetitorDialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRemoveCompetitorDialog(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [removeCompetitorDialog]);

  const handleRemoveWatchedCompetitor = useCallback(
    async (competitor: SidebarCompetitor, rowSlugNav: string) => {
      const storageSlug = normalizeCompetitorSlug(competitor.slug);
      const cacheDomain = coerceSidebarCompetitorUrlHost(competitor);
      setRemovingCompetitorSlug(storageSlug);
      setCompetitorRemoveError(null);

      const result = await deleteSavedCompetitorFromAccount(storageSlug, cacheDomain, activeBrand.id);

      setRemovingCompetitorSlug(null);

      if (!result.ok) {
        setCompetitorRemoveError(result.error);
        return;
      }

      const clientPurgeDomains = collectAdsCacheDomainVariantsForSavedCompetitorRow(
        { slug: competitor.slug, brand_domain: competitor.brand?.domain ?? null },
        cacheDomain.trim() ? cacheDomain : null
      );
      clearAdsLibraryClientCachesForBrandDomains(clientPurgeDomains);

      suppressSidebarUpsertAfterRemoval(competitor);

      const onCompetitorView =
        pathname.startsWith("/dashboard/competitor/") || pathname === "/dashboard/competitor";
      const viewingDeleted =
        onCompetitorView &&
        activeCompetitorSlug !== "" &&
        competitorRowMatchesActivePath(competitor, activeCompetitorSlug, rowSlugNav);

      removeSidebarCompetitor(competitor);
      setCompetitorRemoveError(null);
      refreshSavedCompetitors();
      refreshBillingUsage();

      if (viewingDeleted) {
        router.replace("/dashboard/spy", { scroll: false });
      }
    },
    [pathname, activeCompetitorSlug, activeBrand.id, refreshBillingUsage, refreshSavedCompetitors, router],
  );

  const handleSignOut = async () => {
    clearSidebarCompetitorsStorageForSignOut();
    clearClientCompetitorSlotUsage();
    try {
      await fetch("/auth/sign-out", { method: "POST", credentials: "same-origin" });
    } catch {
      /* fall through — still attempt client sign-out */
    }
    await supabase.auth.signOut();
    window.location.assign("/login");
  };

  const renderRemoveCompetitorButton = (
    competitor: SidebarCompetitor,
    rowSlugNav: string,
    removing: boolean,
    options?: { alwaysVisible?: boolean; strictHoverOnly?: boolean },
  ) => {
    const alwaysVisible = options?.alwaysVisible ?? false;
    const strictHoverOnly = options?.strictHoverOnly ?? false;

    return (
      <button
        type="button"
        disabled={removing}
        onMouseDown={(e) => {
          e.preventDefault();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setRemoveCompetitorDialog({ competitor, rowSlugNav });
        }}
        className={[
          "flex size-8 shrink-0 items-center justify-center rounded-lg text-[#a1a1aa] transition-[color,background-color,opacity,visibility] duration-150",
          "motion-reduce:transition-none hover:bg-red-50/90 hover:text-[#b42318]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--rival-accent-blue)]/40",
          "disabled:pointer-events-none disabled:opacity-30",
          removing || alwaysVisible
            ? "visible opacity-100"
            : strictHoverOnly
              ? "invisible opacity-0 group-hover/comprow:visible group-hover/comprow:opacity-100"
              : [
                  "opacity-0 group-hover/comprow:opacity-100 motion-safe:transition-opacity",
                  "pointer-coarse:opacity-100 focus-visible:opacity-100",
                ].join(" "),
        ].join(" ")}
        title={`Remove ${competitor.name}`}
        aria-label={`Remove ${competitor.name} from watched competitors`}
      >
        {removing ? (
          <span className="size-3.5 animate-pulse rounded-full bg-[#d4d4d8]" aria-hidden />
        ) : (
          <Trash2 className="size-4 shrink-0" strokeWidth={2} />
        )}
      </button>
    );
  };

  const collapsed = sidebarCollapsed;

  return (
    <div
      data-dashboard-app
      className="h-screen w-full max-w-full flex flex-col text-[#343434] font-sans selection:bg-[#DDF1FD] selection:text-[#343434] relative overflow-hidden"
    >
      {/* Brand gradient background */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(165deg, #e6f7ff 0%, #f0faff 40%, #fffde6 80%, #fffcef 100%)" }} />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[10%] h-[500px] w-[500px] rounded-full bg-[#FFF4CB]/20 blur-[120px]" />
        <div className="absolute right-[-10%] top-[20%] h-[400px] w-[400px] rounded-full bg-[#DDF1FD]/30 blur-[100px]" />
      </div>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-row">
      {/* Sidebar */}
      <aside
        className={`hidden sm:flex flex-col h-full min-h-0 sticky top-0 shrink-0 bg-white/80 backdrop-blur-xl border-r border-[#e8e8e8] shadow-[0_4px_24px_rgba(0,0,0,0.04)] motion-safe:transition-[width,min-width] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none z-20 ${
          collapsed
            ? "w-[92px] min-w-[92px] overflow-visible"
            : "w-[280px] min-w-[280px] overflow-x-hidden overflow-y-hidden"
        }`}
      >
        {/* Your brand switcher */}
        <div className={`shrink-0 relative ${collapsed ? "px-3 pt-5 pb-2" : "px-4 pt-5 pb-2"}`}>
          {!collapsed && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] mb-2 px-2.5 text-[color:var(--rival-muted)]">
              Your brand
            </p>
          )}
          {collapsed ? (
            <button
              type="button"
              onClick={() => goToBrandHub(effectiveBrand)}
              className="size-11 shrink-0 rounded-xl overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-[#DDF1FD] active:scale-[0.97] transition-all mx-auto shadow-sm"
              title={effectiveBrand.name}
            >
              {effectiveBrand.logoUrl || effectiveBrand.domain ? (
                <CompetitorLogo
                  sources={{ primary: effectiveBrand.logoUrl, domain: effectiveBrand.domain }}
                  name={effectiveBrand.name}
                  size="lg"
                  shape="rounded"
                  className="h-11 w-11 rounded-xl border-0 shadow-none"
                />
              ) : (
                <div
                  className="w-full h-full text-white flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{ backgroundColor: effectiveBrand.color ?? "#343434" }}
                >
                  {effectiveBrand.badge}
                </div>
              )}
            </button>
          ) : canSwitchBrand ? (
            <div className="flex items-center justify-between w-full rounded-xl bg-white/50 border border-white/60 hover:bg-white/80 hover:border-[#DDF1FD]/60 transition-all text-left group shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
              <button
                type="button"
                onClick={() => goToBrandHub(effectiveBrand)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-l-xl px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--rival-accent-blue)]/35"
              >
                {effectiveBrand.logoUrl || effectiveBrand.domain ? (
                  <div className="h-[36px] w-[36px] shrink-0 overflow-hidden rounded-[10px] border border-white/60 shadow-sm">
                    <CompetitorLogo
                      sources={{ primary: effectiveBrand.logoUrl, domain: effectiveBrand.domain }}
                      name={effectiveBrand.name}
                      size="md"
                      shape="rounded"
                      className="h-9 w-9 rounded-[10px] border-0 shadow-none"
                    />
                  </div>
                ) : (
                  <div
                    className="w-[36px] h-[36px] rounded-[10px] text-white flex items-center justify-center text-[13px] font-bold shrink-0 shadow-sm"
                    style={{ backgroundColor: effectiveBrand.color ?? "#343434" }}
                  >
                    {effectiveBrand.badge}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-[#343434] truncate">{effectiveBrand.name}</span>
                  <span className="block text-[11px] text-[#808080] truncate">Your brand workspace</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setIsBrandMenuOpen((p) => !p)}
                className="flex min-h-[56px] w-11 shrink-0 items-center justify-center rounded-r-xl text-[color:var(--rival-muted)] outline-none transition-colors hover:bg-[#DDF1FD]/30 focus-visible:ring-2 focus-visible:ring-[color:var(--rival-accent-blue)]/35"
                aria-label="Switch brand"
                aria-expanded={isBrandMenuOpen}
              >
                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isBrandMenuOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => goToBrandHub(effectiveBrand)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-white/50 border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.03)] text-left hover:bg-white/80 hover:border-[#DDF1FD]/60 transition-all outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--rival-accent-blue)]/35"
            >
              {effectiveBrand.logoUrl || effectiveBrand.domain ? (
                <div className="h-[36px] w-[36px] shrink-0 overflow-hidden rounded-[10px] border border-white/60 shadow-sm">
                  <CompetitorLogo
                    sources={{ primary: effectiveBrand.logoUrl, domain: effectiveBrand.domain }}
                    name={effectiveBrand.name}
                    size="md"
                    shape="rounded"
                    className="h-9 w-9 rounded-[10px] border-0 shadow-none"
                  />
                </div>
              ) : (
                <div
                  className="w-[36px] h-[36px] rounded-[10px] text-white flex items-center justify-center text-[13px] font-bold shrink-0 shadow-sm"
                  style={{ backgroundColor: effectiveBrand.color ?? "#343434" }}
                >
                  {effectiveBrand.badge}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-[#343434] truncate">{effectiveBrand.name}</span>
                <span className="block text-[11px] text-[#808080] truncate">Your brand workspace</span>
              </div>
            </button>
          )}

          {isBrandMenuOpen && canSwitchBrand && (
            <div
              className={`absolute top-full mt-2 rounded-2xl border border-white/60 bg-white/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(31,38,135,0.12)] py-2 z-30 overflow-hidden ${
                collapsed ? "left-full ml-2 w-[200px] max-w-[calc(100vw-108px)]" : "left-2 right-2"
              }`}
            >
              <div className="px-2 pb-1 shrink-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] px-2 py-1 truncate text-[color:var(--rival-muted)]">
                  Your brands
                </p>
              </div>
              <div className="max-h-[min(40vh,200px)] overflow-y-auto overflow-x-hidden overscroll-contain">
                {brands.map((b) => (
                  <div
                    key={b.id}
                    className={`group/brandrow mx-2 flex items-center rounded-xl transition-all min-w-0 ${
                      activeBrandId === b.id
                        ? "bg-[#DDF1FD]/50 text-[#343434] ring-1 ring-[#DDF1FD]"
                        : "hover:bg-[#DDF1FD]/20 text-[#52525b] hover:text-[#343434]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveBrandId(b.id);
                        localStorage.setItem("rival_active_brand", b.id);
                        goToBrandHub(b);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left"
                    >
                      {b.logoUrl || b.domain ? (
                        <div className="h-[32px] w-[32px] shrink-0 overflow-hidden rounded-[8px] border border-white/60">
                          <CompetitorLogo
                            sources={{ primary: b.logoUrl, domain: b.domain }}
                            name={b.name}
                            size="sm"
                            shape="rounded"
                            className="h-8 w-8 rounded-[8px] border-0 shadow-none"
                          />
                        </div>
                      ) : (
                        <div
                          className="w-[32px] h-[32px] rounded-[8px] text-white flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{ backgroundColor: b.color ?? "#343434" }}
                        >
                          {b.badge}
                        </div>
                      )}
                      <span className="text-[13px] font-medium truncate flex-1 min-w-0">{b.name}</span>
                    </button>
                    <button
                      type="button"
                      disabled={brands.length <= 1 || removingBrandId === b.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void handleDeleteBrand(b);
                      }}
                      className="mr-2 flex size-7 shrink-0 items-center justify-center rounded-lg text-[#a1a1aa] opacity-0 transition-[opacity,color,background-color] hover:bg-red-50 hover:text-[#b42318] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--rival-accent-blue)]/40 disabled:pointer-events-none disabled:opacity-25 group-hover/brandrow:opacity-100"
                      title={`Delete ${b.name}`}
                      aria-label={`Delete ${b.name} brand workspace`}
                    >
                      {removingBrandId === b.id ? (
                        <span className="size-3.5 animate-pulse rounded-full bg-[#d4d4d8]" aria-hidden />
                      ) : (
                        <Trash2 className="size-3.5" strokeWidth={2} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
              {brandRemoveError && (
                <p className="mx-4 mt-1 text-[11px] leading-snug text-[#b42318]">{brandRemoveError}</p>
              )}
              <div className="mx-2 mt-1 border-t border-[#e8e8e8]/90 pt-1.5">
                <button
                  type="button"
                  onClick={handleAddBrand}
                  disabled={
                    tierAllowsMultipleBrandWorkspaces(billingPlanTier) &&
                    brands.length >= maxOwnBrandWorkspaces
                  }
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[12px] font-semibold text-[#343434] transition-colors hover:bg-[#DDF1FD]/25 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Plus className="size-3.5" />
                  Add brand
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className={`shrink-0 ${collapsed ? "mx-3" : "mx-4"} my-2`}>
          <div className="h-px bg-[#e8e8e8]/90" />
        </div>

        {/* Rival Agent — between brand and search */}
        <div className={`shrink-0 ${collapsed ? "px-3" : "px-4"} pb-0.5 pt-0`}>
          <SidebarRivalAgentControl collapsed={collapsed} />
        </div>

        <div className={`shrink-0 ${collapsed ? "px-3" : "px-4"} pt-2 pb-0.5`}>
          <Link
            href="/dashboard/discovery"
            scroll={false}
            className={`flex items-center rounded-xl transition-colors duration-200 motion-reduce:transition-none ${
              pathname === "/dashboard/discovery"
                ? collapsed
                  ? "bg-[color:var(--rival-accent-blue)]/70 text-[color:var(--rival-primary)] ring-1 ring-[color:var(--rival-accent-blue)]"
                  : "bg-[color:var(--rival-accent-blue)]/70 text-[color:var(--rival-primary)] ring-1 ring-[color:var(--rival-accent-blue)]"
                : "border border-transparent bg-white/50 text-[#52525b] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-white/90 hover:text-[color:var(--rival-primary)] hover:border-[#e8e8e8]/90"
            } ${collapsed ? "size-11 shrink-0 justify-center" : "min-h-[52px] gap-3 px-3 py-2.5 w-full items-center"}`}
            title="Discovery"
          >
            <Compass className={`shrink-0 ${collapsed ? "w-[18px] h-[18px]" : "w-[18px] h-[18px]"}`} />
            {!collapsed && <span className="text-[14px] font-medium">Discovery</span>}
          </Link>
        </div>

        <div className={`shrink-0 ${collapsed ? "px-3" : "px-4"} pb-0.5 pt-1`}>
          <Link
            href="/dashboard/saved"
            scroll={false}
            className={`flex items-center rounded-xl transition-colors duration-200 motion-reduce:transition-none ${
              pathname === "/dashboard/saved"
                ? collapsed
                  ? "bg-[color:var(--rival-accent-blue)]/70 text-[color:var(--rival-primary)] ring-1 ring-[color:var(--rival-accent-blue)]"
                  : "bg-[color:var(--rival-accent-blue)]/70 text-[color:var(--rival-primary)] ring-1 ring-[color:var(--rival-accent-blue)]"
                : "border border-transparent bg-white/50 text-[#52525b] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-white/90 hover:text-[color:var(--rival-primary)] hover:border-[#e8e8e8]/90"
            } ${collapsed ? "size-11 shrink-0 justify-center" : "min-h-[52px] gap-3 px-3 py-2.5 w-full items-center"}`}
            title="Saved"
          >
            <Bookmark className={`shrink-0 ${collapsed ? "w-[18px] h-[18px]" : "w-[18px] h-[18px]"}`} />
            {!collapsed && <span className="text-[14px] font-medium">Saved</span>}
          </Link>
        </div>

        {/* Find competitor + competitors header + filter — fixed under brand */}
        <div className={`shrink-0 ${collapsed ? "px-3" : "px-4"} pt-2 pb-2`}>
          <div className={collapsed ? "flex flex-col items-center gap-2" : "space-y-1"}>
            <Link
              href="/dashboard/spy"
              scroll={false}
              className={`flex items-center rounded-xl transition-colors duration-200 motion-reduce:transition-none ${
                pathname === "/dashboard/spy" || pathname === "/dashboard/searching"
                  ? collapsed
                    ? "bg-[color:var(--rival-accent-blue)]/70 text-[color:var(--rival-primary)] ring-1 ring-[color:var(--rival-accent-blue)]"
                    : "bg-[color:var(--rival-accent-blue)]/70 text-[color:var(--rival-primary)] ring-1 ring-[color:var(--rival-accent-blue)]"
                  : "border border-transparent bg-white/50 text-[#52525b] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-white/90 hover:text-[color:var(--rival-primary)] hover:border-[#e8e8e8]/90"
              } ${collapsed ? "size-11 shrink-0 justify-center" : "min-h-[52px] gap-3 px-3 py-2.5 w-full items-center"}`}
              title="Find competitor"
            >
              <Search className={`shrink-0 ${collapsed ? "w-[18px] h-[18px]" : "w-[18px] h-[18px]"}`} />
              {!collapsed && <span className="text-[14px] font-medium">Find competitor</span>}
            </Link>
          </div>

          {!collapsed && (
            <div className="mt-5 mb-2 px-3 flex items-baseline justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--rival-muted)]">
                Competitors
              </p>
              <span className="text-[10px] font-semibold tabular-nums shrink-0 text-[#b4b4b8]" title="Watched competitor slots across all your brands">
                {globalCompetitorsUsed ?? sidebarCompetitorRows.length}/{maxWatchedCompetitorsCap}
              </span>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto my-2.5 h-px w-9 shrink-0 rounded-full bg-[#e5e7eb]" aria-hidden />
          )}
        </div>

        {/* Competitor list only — scrolls */}
        <div
          className={`rival-subtle-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain ${collapsed ? "px-3" : "px-4"} pb-2 pt-1`}
        >
          {!collapsed && competitorRemoveError ? (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50/90 px-3 py-2 text-[12px] font-medium leading-snug text-[#b42318] shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <span>{competitorRemoveError}</span>
                <button
                  type="button"
                  onClick={() => setCompetitorRemoveError(null)}
                  className="shrink-0 text-[11px] font-semibold underline underline-offset-2 hover:text-[#941f15]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}
          <div className={collapsed ? "flex flex-col items-center gap-2.5" : "space-y-1.5"}>
            {sidebarCompetitorRows.map((competitor, competitorIdx) => {
              const urlHost = coerceSidebarCompetitorUrlHost(competitor);
              const rowSlug = urlHost || normalizeCompetitorSlug(competitor.slug);
              const rowReactKey = `${normalizeCompetitorSlug(competitor.slug)}:${competitorIdx}`;

              const showDemoMarkedDot = !isOnDemoPath && shouldShowDemoMarkedCompetitorDot(demoOwnerEmail, competitor);
              const onCompetitorView = isOnDemoPath
                ? pathname.startsWith("/dashboard/demo/competitor/")
                : pathname.startsWith("/dashboard/competitor/") || pathname === "/dashboard/competitor";
              const isActive =
                onCompetitorView && activeCompetitorSlug !== "" && activeCompetitorSlug === rowSlug;
              const competitorRowRing =
                "ring-2 ring-inset motion-reduce:transition-none transition-[background-color,color,box-shadow] duration-200 ease-out";
              const storageKey = normalizeCompetitorSlug(competitor.slug);
              const removing = removingCompetitorSlug !== null && removingCompetitorSlug === storageKey;
              const activeRowStyles = isActive
                ? "bg-[color:var(--rival-accent-blue)]/45 text-[color:var(--rival-primary)] shadow-sm ring-[color:var(--rival-accent-blue)]/60"
                : "bg-transparent text-[#52525b] ring-transparent hover:bg-white/72 hover:text-[color:var(--rival-primary)]";

              if (competitorSidebarShowsLoadingSkeleton(competitor)) {
                if (collapsed) {
                  return (
                    <div
                      key={`pending-${rowReactKey}`}
                      className={`group/comprow relative mx-auto flex size-11 shrink-0 items-center justify-center rounded-xl ${competitorRowRing} ${
                        isActive
                          ? "bg-[color:var(--rival-accent-blue)]/35 shadow-sm ring-[color:var(--rival-accent-blue)]/55"
                          : "bg-transparent ring-transparent"
                      }`}
                      aria-busy="true"
                      aria-label={`Loading competitor ${competitor.name}`}
                      title={competitor.name}
                    >
                      <SidebarCompetitorSkeleton collapsed />
                      <div className="absolute inset-0 flex items-start justify-end pt-0.5 pr-0.5">
                        {!isOnDemoPath
                          ? renderRemoveCompetitorButton(competitor, rowSlug, removing, { strictHoverOnly: true })
                          : null}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={`pending-${rowReactKey}`}
                    className={`group/comprow relative w-full min-w-0 rounded-xl ${competitorRowRing} ${activeRowStyles}`}
                    aria-busy="true"
                    aria-label={`Loading competitor ${competitor.name}`}
                    title={competitor.name}
                  >
                    <SidebarCompetitorSkeleton collapsed={false} />
                    <div className="absolute inset-y-0 right-0 z-10 flex items-center pr-2">
                      {!isOnDemoPath
                        ? renderRemoveCompetitorButton(competitor, rowSlug, removing, { strictHoverOnly: true })
                        : null}
                    </div>
                  </div>
                );
              }
              const href = isOnDemoPath
                ? buildDashboardDemoCompetitorPath(rowSlug)
                : buildCompetitorSidebarHref(competitor);

              if (collapsed) {
                return (
                  <div key={rowReactKey} className="relative">
                    <Link
                      href={href}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex size-11 shrink-0 items-center justify-center rounded-xl outline-none ${competitorRowRing} ${activeRowStyles}`}
                      title={showDemoMarkedDot ? `${competitor.name} — ${DEMO_MARKED_COMPETITOR_TITLE}` : competitor.name}
                      scroll={false}
                    >
                      <SidebarCompetitorAvatar competitor={competitor} collapsed />
                    </Link>
                    {showDemoMarkedDot ? (
                      <span
                        className="pointer-events-none absolute right-0 top-0"
                        title={DEMO_MARKED_COMPETITOR_TITLE}
                      >
                        <DemoCompetitorYellowDot />
                      </span>
                    ) : null}
                  </div>
                );
              }

              return (
                <div
                  key={rowReactKey}
                  className={`group/comprow relative flex min-h-[52px] w-full min-w-0 items-stretch rounded-xl ${competitorRowRing} ${activeRowStyles}`}
                >
                  {showDemoMarkedDot ? (
                    <span
                      className="pointer-events-none absolute right-9 top-2 z-20"
                      title={DEMO_MARKED_COMPETITOR_TITLE}
                    >
                      <DemoCompetitorYellowDot />
                    </span>
                  ) : null}
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    aria-busy={removing ? "true" : undefined}
                    className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 pr-2 text-left text-inherit no-underline outline-none"
                    title={showDemoMarkedDot ? `${competitor.name} — ${DEMO_MARKED_COMPETITOR_TITLE}` : competitor.name}
                    scroll={false}
                  >
                    <SidebarCompetitorAvatar competitor={competitor} collapsed={false} />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-[14px] font-medium leading-snug transition-colors duration-200 motion-reduce:transition-none ${
                          isActive ? "text-[color:var(--rival-primary)]" : "text-[#3f3f46]"
                        }`}
                      >
                        {competitor.name}
                      </p>
                      <p
                        className={`truncate text-[12px] leading-snug transition-colors duration-200 motion-reduce:transition-none ${
                          isActive ? "text-[color:var(--rival-primary)]/72" : "text-[color:var(--rival-muted)]"
                        }`}
                      >
                        {urlHost}
                      </p>
                    </div>
                  </Link>
                  <div className="relative flex shrink-0 items-center pr-2">
                    {!isOnDemoPath ? renderRemoveCompetitorButton(competitor, rowSlug, removing) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom: settings, sign out, collapse */}
        <div
          className={`shrink-0 border-t border-[#e8e8e8]/90 ${collapsed ? "overflow-visible px-3 py-3" : "px-4 py-2.5"}`}
        >
          {collapsed ? (
            <div className="flex flex-col items-center gap-2.5 overflow-visible">
              <DemoSidebarLink collapsed />
              <button
                type="button"
                onClick={() => router.push("/dashboard/settings", { scroll: false })}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#52525b] ring-1 ring-transparent shadow-sm transition-colors hover:bg-white/85 hover:text-[color:var(--rival-primary)] hover:ring-[#e8e8e8]/80 active:scale-[0.97]"
                title="Settings"
              >
                <Settings className="h-[17px] w-[17px] shrink-0" strokeWidth={2.25} />
              </button>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#52525b] ring-1 ring-transparent shadow-sm transition-colors hover:bg-white/85 hover:text-[color:var(--rival-primary)] hover:ring-[#e8e8e8]/80 active:scale-[0.97]"
                title="Sign out"
              >
                <LogOut className="h-[17px] w-[17px] shrink-0" strokeWidth={2.25} />
              </button>
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[color:var(--rival-muted)] ring-1 ring-transparent shadow-sm transition-colors hover:bg-white/85 hover:text-[#52525b] hover:ring-[#e8e8e8]/80 active:scale-[0.97]"
                title="Expand sidebar"
              >
                <ChevronsRight className="h-[17px] w-[17px] shrink-0" strokeWidth={2.25} />
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <DemoSidebarLink collapsed={false} />
              <button
                type="button"
                onClick={() => router.push("/dashboard/settings", { scroll: false })}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[#52525b] transition-colors hover:bg-white/75 hover:text-[color:var(--rival-primary)]"
              >
                <Settings className="h-[18px] w-[18px] shrink-0" />
                <span className="text-[14px] font-medium">Settings</span>
              </button>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[#52525b] transition-colors hover:bg-white/75 hover:text-[color:var(--rival-primary)]"
              >
                <LogOut className="h-[18px] w-[18px] shrink-0" />
                <span className="text-[14px] font-medium">Sign out</span>
              </button>
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[color:var(--rival-muted)] transition-colors hover:bg-white/75 hover:text-[#52525b]"
                title="Collapse sidebar"
              >
                <ChevronsLeft className="h-[18px] w-[18px] shrink-0" />
                <span className="text-[14px] font-medium">Collapse</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="rival-subtle-scroll relative z-10 flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto scroll-auto bg-slate-50">
        <ScrapePausedBanner />
        <div
          className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col"
          onClick={() => setIsBrandMenuOpen(false)}
        >
          {!pricingGate && showWelcome && isGenericDashboardLanding(pathname) ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="mx-4 w-full max-w-[480px] rounded-3xl bg-white p-10 text-center shadow-[0_8px_40px_rgba(0,0,0,0.1)]">
                <RivalLogoImg className="mx-auto mb-6 h-7 w-auto max-w-[160px] object-contain" />

                <h2 className="mb-2 text-[22px] font-bold text-[#1a1a2e]">Your workspace is ready</h2>
                <p className="mb-8 text-[14px] leading-relaxed text-[#71717a]">
                  Start by spying on a competitor. Enter their domain and Rival will scrape their ads across every
                  platform automatically.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    dismissFirstRunWelcome();
                    router.push("/dashboard/spy", { scroll: false });
                  }}
                  className="mb-3 w-full rounded-xl bg-[#1a1a2e] py-3 text-[14px] font-medium text-white transition-colors hover:bg-[#2d2d44]"
                >
                  Spy on your first competitor →
                </button>

                <button
                  type="button"
                  onClick={dismissFirstRunWelcome}
                  className="text-[13px] text-[#a1a1aa] transition-colors hover:text-[#71717a]"
                >
                  I&apos;ll explore on my own
                </button>
              </div>
            </div>
          ) : null}
          <BrandProvider brand={effectiveBrand}>
            <div className="relative z-[6] flex min-h-0 min-w-0 flex-1 flex-col">
              {pricingGate ? (
                <div
                  className="pointer-events-none absolute inset-0 z-0 overflow-hidden motion-reduce:blur-none"
                  aria-hidden
                >
                  <div className="h-full blur-[1.5px] motion-reduce:blur-none">
                    <PricingGateDashboardMock />
                  </div>
                </div>
              ) : null}
              <div
                className={`rival-dashboard-route-shell relative z-10 flex min-h-0 min-w-0 flex-1 flex-col ${
                  pricingGate
                    ? "opacity-[0.38] blur-[3px] saturate-[0.88] motion-reduce:opacity-50 motion-reduce:blur-none motion-reduce:saturate-100"
                    : ""
                }`}
              >
              <SaveAdModalProvider>
                {children}
              </SaveAdModalProvider>
              </div>
            </div>
          </BrandProvider>
          {pricingGate ? <PostOnboardingPricingOverlay /> : null}
        </div>
      </main>

      {removeCompetitorDialog ? (
        <RemoveWatchedCompetitorDialog
          competitor={removeCompetitorDialog.competitor}
          onDismiss={() => setRemoveCompetitorDialog(null)}
          onConfirmRemove={() => {
            const pending = removeCompetitorDialog;
            setRemoveCompetitorDialog(null);
            if (pending) void handleRemoveWatchedCompetitor(pending.competitor, pending.rowSlugNav);
          }}
        />
      ) : null}
      {brandWorkspaceLimitDialog ? (
        <BrandWorkspaceLimitDialog
          variant={brandWorkspaceLimitDialog}
          onDismiss={() => setBrandWorkspaceLimitDialog(null)}
        />
      ) : null}
      <RecentPlatformRefreshNotice />
      <Toaster richColors closeButton />
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-[color:var(--rival-bg-soft,#fafafa)] px-6">
          <RivalLoadingBlock padded={false} />
        </div>
      }
    >
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}
