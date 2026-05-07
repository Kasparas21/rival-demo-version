"use client";
import React, { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { LogOut, Search, ChevronDown, ChevronsLeft, ChevronsRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BrandProvider, type Brand } from "./brand-context";
import { BrandLogoThumb } from "@/components/brand-logo-thumb";
import { RivalLogoImg } from "@/components/rival-logo";
import { SidebarCompetitorAvatar } from "@/components/sidebar-competitor-avatar";
import { SidebarCompetitorSkeleton } from "@/components/sidebar-competitor-skeleton";
import {
  buildCompetitorSidebarHref,
  coerceSidebarCompetitorUrlHost,
  competitorSidebarShowsLoadingSkeleton,
  dedupeSidebarCompetitors,
  loadSidebarCompetitors,
  mergeAccountSidebarRowsWithLocalLibraryContext,
  MAX_WATCHED_COMPETITORS,
  normalizeCompetitorSlug,
  removeSidebarCompetitor,
  saveSidebarCompetitors,
  SIDEBAR_COMPETITORS_EVENT,
  SIDEBAR_COMPETITORS_STORAGE_KEY,
  type SidebarCompetitor,
} from "@/lib/sidebar-competitors";
import { competitorHostFromDashboardPathname } from "@/lib/competitor-dashboard-url";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  deleteSavedCompetitorFromAccount,
  fetchSavedCompetitorsFromAccount,
  syncCompetitorsToAccount,
} from "@/lib/account/client";
import { RIVAL_PROFILE_UPDATED_EVENT } from "@/lib/account/profile-events";

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
          They will be removed from your watched competitors. Cached scraped ads and strategy summaries for{" "}
          <span className="font-medium text-[#3f3f46]">{domainLabel}</span> will be cleared from your account.
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

function mapApiBrandRow(row: {
  id: string;
  name: string;
  domain?: string | null;
  logo_url?: string | null;
  color?: string | null;
  brand_context?: string | null;
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
  return {
    id: row.id,
    name,
    badge,
    logoUrl: row.logo_url?.trim() || undefined,
    color: row.color?.trim() || "#343434",
    ...(dom ? { domain: dom } : {}),
    ...(ctx ? { brandContext: ctx } : {}),
  };
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [brands, setBrands] = useState<Brand[]>([]);
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
  const [profileAvatarFailed, setProfileAvatarFailed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [competitorRemoveError, setCompetitorRemoveError] = useState<string | null>(null);
  const [removingCompetitorSlug, setRemovingCompetitorSlug] = useState<string | null>(null);
  const [removeCompetitorDialog, setRemoveCompetitorDialog] = useState<{
    competitor: SidebarCompetitor;
    rowSlugNav: string;
  } | null>(null);

  const sidebarCompetitorRows = useMemo(
    () => dedupeSidebarCompetitors(savedCompetitors),
    [savedCompetitors]
  );

  const refreshSavedCompetitors = useCallback(() => {
    setSavedCompetitors(loadSidebarCompetitors());
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
      if (e.key === SIDEBAR_COMPETITORS_STORAGE_KEY) refreshSavedCompetitors();
    };
    window.addEventListener(SIDEBAR_COMPETITORS_EVENT, refreshSavedCompetitors);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SIDEBAR_COMPETITORS_EVENT, refreshSavedCompetitors);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshSavedCompetitors]);

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
          }[];
        }) => {
          if (!d.ok || !d.brands?.length) {
            return;
          }
          const mapped = d.brands.map(mapApiBrandRow);
          setBrands(mapped);
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
    setProfileAvatarFailed(false);
  }, [userProfile?.avatar_url]);

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
      const localCompetitors = loadSidebarCompetitors();
      const remoteCompetitors = await fetchSavedCompetitorsFromAccount();

      if (cancelled) return;

      if (remoteCompetitors.length > 0) {
        const merged = mergeAccountSidebarRowsWithLocalLibraryContext(
          remoteCompetitors as SidebarCompetitor[],
          localCompetitors
        );
        saveSidebarCompetitors(merged);
        refreshSavedCompetitors();
        return;
      }

      if (localCompetitors.length > 0) {
        await syncCompetitorsToAccount(localCompetitors);
      }
    };

    void syncAccountCompetitors();

    return () => {
      cancelled = true;
    };
  }, [refreshSavedCompetitors]);

  useEffect(() => {
    if (activeBrandId) localStorage.setItem("rival_active_brand", activeBrandId);
  }, [activeBrandId]);

  useEffect(() => {
    localStorage.setItem("rival_sidebar_collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

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
  const pathCompetitorHost = competitorHostFromDashboardPathname(pathname);
  const queryCompetitorHost = searchParams.get("url")?.trim();
  const activeCompetitorSlug =
    pathCompetitorHost || (queryCompetitorHost ? normalizeCompetitorSlug(queryCompetitorHost) : "");

  const canSwitchBrand = brands.length > 1;

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

      const result = await deleteSavedCompetitorFromAccount(storageSlug, cacheDomain);

      setRemovingCompetitorSlug(null);

      if (!result.ok) {
        setCompetitorRemoveError(result.error);
        return;
      }

      removeSidebarCompetitor(competitor);
      refreshSavedCompetitors();

      const navigatedSlug = normalizeCompetitorSlug(rowSlugNav);
      const onCompetitorView =
        pathname.startsWith("/dashboard/competitor/") || pathname === "/dashboard/competitor";
      if (
        onCompetitorView &&
        activeCompetitorSlug !== "" &&
        activeCompetitorSlug === navigatedSlug
      ) {
        router.push("/dashboard/spy", { scroll: false });
      }
    },
    [
      pathname,
      activeCompetitorSlug,
      refreshSavedCompetitors,
      router,
    ]
  );

  const handleSignOut = async () => {
    try {
      await fetch("/auth/sign-out", { method: "POST", credentials: "same-origin" });
    } catch {
      /* fall through — still attempt client sign-out */
    }
    await supabase.auth.signOut();
    window.location.assign("/login");
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
              onClick={() => {
                setSidebarCollapsed(false);
                if (canSwitchBrand) setIsBrandMenuOpen(true);
              }}
              className="size-11 shrink-0 rounded-xl overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-[#DDF1FD] active:scale-[0.97] transition-all mx-auto shadow-sm"
              title={activeBrand.name}
            >
              {activeBrand.logoUrl ? (
                <BrandLogoThumb src={activeBrand.logoUrl} alt={activeBrand.name} className="bg-white" />
              ) : (
                <div
                  className="w-full h-full text-white flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{ backgroundColor: activeBrand.color ?? "#343434" }}
                >
                  {activeBrand.badge}
                </div>
              )}
            </button>
          ) : canSwitchBrand ? (
            <button
              type="button"
              onClick={() => setIsBrandMenuOpen((p) => !p)}
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl bg-white/50 border border-white/60 hover:bg-white/80 hover:border-[#DDF1FD]/60 transition-all text-left group shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
            >
              <div className="flex items-center gap-3 min-w-0">
                {activeBrand.logoUrl ? (
                  <div className="h-[36px] w-[36px] shrink-0 overflow-hidden rounded-[10px] border border-white/60 shadow-sm">
                    <BrandLogoThumb src={activeBrand.logoUrl} alt={activeBrand.name} className="bg-white" />
                  </div>
                ) : (
                  <div
                    className="w-[36px] h-[36px] rounded-[10px] text-white flex items-center justify-center text-[13px] font-bold shrink-0 shadow-sm"
                    style={{ backgroundColor: activeBrand.color ?? "#343434" }}
                  >
                    {activeBrand.badge}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-[#343434] truncate">{activeBrand.name}</span>
                  <span className="block text-[11px] text-[#808080] truncate">Switch brand</span>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform text-[color:var(--rival-muted)] ${isBrandMenuOpen ? "rotate-180" : ""}`} />
            </button>
          ) : (
            <div className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-white/50 border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
              {activeBrand.logoUrl ? (
                <div className="h-[36px] w-[36px] shrink-0 overflow-hidden rounded-[10px] border border-white/60 shadow-sm">
                  <BrandLogoThumb src={activeBrand.logoUrl} alt={activeBrand.name} className="bg-white" />
                </div>
              ) : (
                <div
                  className="w-[36px] h-[36px] rounded-[10px] text-white flex items-center justify-center text-[13px] font-bold shrink-0 shadow-sm"
                  style={{ backgroundColor: activeBrand.color ?? "#343434" }}
                >
                  {activeBrand.badge}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-[#343434] truncate">{activeBrand.name}</span>
                <span className="block text-[11px] text-[#808080] truncate">Your brand workspace</span>
              </div>
            </div>
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
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setActiveBrandId(b.id);
                      setIsBrandMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 mx-2 rounded-xl text-left transition-all min-w-0 ${
                      activeBrandId === b.id
                        ? "bg-[#DDF1FD]/50 text-[#343434] ring-1 ring-[#DDF1FD]"
                        : "hover:bg-[#DDF1FD]/20 text-[#52525b] hover:text-[#343434]"
                    }`}
                  >
                    {b.logoUrl ? (
                      <div className="h-[32px] w-[32px] shrink-0 overflow-hidden rounded-[8px] border border-white/60">
                        <BrandLogoThumb src={b.logoUrl} alt={b.name} className="bg-white" />
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
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className={`shrink-0 ${collapsed ? "mx-3" : "mx-4"} my-2`}>
          <div className="h-px bg-[#e8e8e8]/90" />
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
              <span className="text-[10px] font-semibold tabular-nums shrink-0 text-[#b4b4b8]" title="Watched competitors">
                {sidebarCompetitorRows.length}/{MAX_WATCHED_COMPETITORS}
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
              const onCompetitorView =
                pathname.startsWith("/dashboard/competitor/") || pathname === "/dashboard/competitor";
              const isActive =
                onCompetitorView && activeCompetitorSlug !== "" && activeCompetitorSlug === rowSlug;
              const competitorRowRing =
                "ring-2 ring-inset motion-reduce:transition-none transition-[background-color,color,box-shadow] duration-200 ease-out";
              if (competitorSidebarShowsLoadingSkeleton(competitor)) {
                return (
                  <div
                    key={`pending-${rowReactKey}`}
                    className={`rounded-xl ${competitorRowRing} ${
                      isActive
                        ? "bg-[color:var(--rival-accent-blue)]/35 shadow-sm ring-[color:var(--rival-accent-blue)]/55"
                        : "bg-transparent ring-transparent"
                    } ${collapsed ? "mx-auto flex size-11 shrink-0 items-center justify-center" : ""}`}
                    aria-busy="true"
                    aria-label={`Loading competitor ${competitor.name}`}
                    title={competitor.name}
                  >
                    <SidebarCompetitorSkeleton collapsed={collapsed} />
                  </div>
                );
              }
              const href = buildCompetitorSidebarHref(competitor);

              const activeRowStyles = isActive
                ? "bg-[color:var(--rival-accent-blue)]/45 text-[color:var(--rival-primary)] shadow-sm ring-[color:var(--rival-accent-blue)]/60"
                : "bg-transparent text-[#52525b] ring-transparent hover:bg-white/72 hover:text-[color:var(--rival-primary)]";

              if (collapsed) {
                return (
                  <Link
                    key={rowReactKey}
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl outline-none ${competitorRowRing} ${activeRowStyles}`}
                    title={competitor.name}
                    scroll={false}
                  >
                    <SidebarCompetitorAvatar competitor={competitor} collapsed />
                  </Link>
                );
              }

              const storageKey = normalizeCompetitorSlug(competitor.slug);
              const removing = removingCompetitorSlug !== null && removingCompetitorSlug === storageKey;

              return (
                <div
                  key={rowReactKey}
                  className={`group/comprow relative flex min-h-[52px] w-full min-w-0 items-stretch rounded-xl ${competitorRowRing} ${activeRowStyles}`}
                >
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    aria-busy={removing ? "true" : undefined}
                    className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 pr-2 text-left text-inherit no-underline outline-none"
                    title={competitor.name}
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
                    <button
                      type="button"
                      disabled={removing}
                      onMouseDown={(e) => {
                        /* avoid Link focus ring / accidental navigation pulse */
                        e.preventDefault();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setRemoveCompetitorDialog({ competitor, rowSlugNav: rowSlug });
                      }}
                      className={[
                        "flex size-8 shrink-0 items-center justify-center rounded-lg text-[#a1a1aa] transition-colors duration-150",
                        "motion-reduce:transition-none hover:bg-red-50/90 hover:text-[#b42318]",
                        "pointer-coarse:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--rival-accent-blue)]/40",
                        "disabled:pointer-events-none disabled:opacity-30",
                        removing
                          ? "opacity-100"
                          : "opacity-0 group-hover/comprow:opacity-100 motion-safe:transition-opacity",
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom: user identity, sign out, collapse */}
        <div
          className={`shrink-0 border-t border-[#e8e8e8]/90 ${collapsed ? "overflow-visible px-3 py-3" : "px-4 py-2.5"}`}
        >
          {collapsed ? (
            <div className="flex flex-col items-center gap-2.5 overflow-visible">
              {userProfile ? (
                <div className="group/userdock relative z-[55] flex h-10 w-10 shrink-0 justify-center overflow-hidden rounded-[10px]">
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/settings", { scroll: false })}
                    className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden rounded-[10px] bg-[#f4f4f5] shadow-sm ring-1 ring-[#e8e8e8]/90 transition-[transform,background-color,box-shadow] duration-150 ease-out hover:bg-white hover:ring-[color:var(--rival-accent-blue)]/45 active:scale-[0.97]"
                    title={userProfile.full_name || userProfile.email || "Account settings"}
                  >
                    {userProfile.avatar_url && !profileAvatarFailed ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={userProfile.avatar_url}
                        alt=""
                        onError={() => setProfileAvatarFailed(true)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-[#6366f1] text-[12px] font-bold text-white">
                        {(userProfile.full_name?.[0] ?? userProfile.email?.[0] ?? "?").toUpperCase()}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void handleSignOut();
                    }}
                    className="pointer-coarse:hidden pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[10px] bg-[#1a1a2e]/78 text-white opacity-0 shadow-inner ring-1 ring-black/15 transition-opacity duration-150 outline-none backdrop-blur-[1px] focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[color:var(--rival-accent-blue)]/60 motion-reduce:transition-none group-hover/userdock:pointer-events-auto group-hover/userdock:opacity-100 motion-reduce:group-hover/userdock:opacity-100"
                    title="Sign out"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-[18px] w-[18px] shrink-0 drop-shadow-sm" strokeWidth={2.5} aria-hidden />
                  </button>
                </div>
              ) : null}

              {/* Coarse pointer (touch): sign out stays visible — no hover affordance */}
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className={[
                  "size-10 shrink-0 flex items-center justify-center rounded-xl text-[#52525b]",
                  "ring-1 ring-transparent shadow-sm transition-colors hover:bg-white/85",
                  "hover:text-[color:var(--rival-primary)] hover:ring-[#e8e8e8]/80 active:scale-[0.97]",
                  userProfile ? "hidden pointer-coarse:flex" : "flex",
                ].join(" ")}
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
              {userProfile ? (
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/settings", { scroll: false })}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[#f4f4f5]"
                  title={userProfile.full_name || userProfile.email || "Account"}
                >
                  {userProfile.avatar_url && !profileAvatarFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={userProfile.avatar_url}
                      alt=""
                      onError={() => setProfileAvatarFailed(true)}
                      className="h-7 w-7 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#6366f1] text-[11px] font-bold text-white">
                      {(userProfile.full_name?.[0] ?? userProfile.email?.[0] ?? "?").toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-[#1a1a2e]">
                      {userProfile.full_name?.trim() || userProfile.email}
                    </p>
                    {userProfile.company_name ? (
                      <p className="truncate text-[11px] text-[#71717a]">{userProfile.company_name}</p>
                    ) : null}
                  </div>
                </button>
              ) : null}
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
      <main className="rival-subtle-scroll flex-1 flex flex-col relative min-w-0 overflow-x-hidden overflow-y-auto scroll-auto z-10">
        <div
          className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col"
          onClick={() => setIsBrandMenuOpen(false)}
        >
          {showWelcome && pathname === "/dashboard" ? (
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
          <BrandProvider brand={activeBrand}>
            <div className="rival-dashboard-route-shell flex min-h-0 min-w-0 flex-1 flex-col">
              {children}
            </div>
          </BrandProvider>
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
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center text-[#808080]">Loading...</div>}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}
