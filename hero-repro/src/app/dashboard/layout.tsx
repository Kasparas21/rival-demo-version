"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { LogOut, Plus, Search, ChevronDown, ChevronsLeft, ChevronsRight } from "lucide-react";
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
  competitorMatchesFilter,
  saveSidebarCompetitors,
  loadSidebarCompetitors,
  mergeSavedCompetitorsWithDemos,
  normalizeCompetitorSlug,
  SIDEBAR_COMPETITORS_EVENT,
  SIDEBAR_COMPETITORS_STORAGE_KEY,
  type SidebarCompetitor,
} from "@/lib/sidebar-competitors";
import { getDashboardDemoCompetitors } from "@/lib/dashboard-demo-competitors";
import { competitorHostFromDashboardPathname } from "@/lib/competitor-dashboard-url";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { fetchSavedCompetitorsFromAccount, syncCompetitorsToAccount } from "@/lib/account/client";
import { DemoBanner } from "@/components/demo-banner";

const FIRST_RUN_WELCOME_DISMISSED_KEY = "rival_first_run_welcome_dismissed";

const defaultBrands: Brand[] = [
  { id: "my-brand", name: "My Brand", badge: "M", color: "#343434" },
  { id: "agency", name: "Agency Account", badge: "A", color: "#5a99b8" },
  { id: "growth-lab", name: "Growth Lab", badge: "G", color: "#95C14B" },
];

function mapApiBrandRow(row: {
  id: string;
  name: string;
  domain?: string | null;
  logo_url?: string | null;
  color?: string | null;
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
  return {
    id: row.id,
    name,
    badge,
    logoUrl: row.logo_url?.trim() || undefined,
    color: row.color?.trim() || "#343434",
  };
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [brands, setBrands] = useState<Brand[]>(defaultBrands);
  const [activeBrandId, setActiveBrandId] = useState(defaultBrands[0].id);
  const [isBrandMenuOpen, setIsBrandMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [savedCompetitors, setSavedCompetitors] = useState<SidebarCompetitor[]>([]);
  const [competitorFilter, setCompetitorFilter] = useState("");
  const competitorSearchRef = useRef<HTMLInputElement>(null);
  const [userProfile, setUserProfile] = useState<{
    full_name?: string | null;
    company_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  } | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  const demoSidebarCompetitors: SidebarCompetitor[] = useMemo(() => getDashboardDemoCompetitors(), []);

  const sidebarCompetitorRows = useMemo(
    () => mergeSavedCompetitorsWithDemos(savedCompetitors, demoSidebarCompetitors),
    [savedCompetitors, demoSidebarCompetitors]
  );

  const filteredSidebarRows = useMemo(
    () => sidebarCompetitorRows.filter((c) => competitorMatchesFilter(c, competitorFilter)),
    [sidebarCompetitorRows, competitorFilter]
  );

  const rowsToRender = useMemo(
    () => (sidebarCollapsed ? sidebarCompetitorRows : filteredSidebarRows),
    [sidebarCollapsed, sidebarCompetitorRows, filteredSidebarRows]
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

  useEffect(() => {
    void fetch("/api/account/profile")
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

  useEffect(() => {
    void fetch("/api/account/brands")
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
    if (brands.length === 0) return;
    if (!brands.some((b) => b.id === activeBrandId)) {
      setActiveBrandId(brands[0].id);
    }
  }, [brands, activeBrandId]);

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
        saveSidebarCompetitors(remoteCompetitors);
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
    localStorage.setItem("rival_active_brand", activeBrandId);
  }, [activeBrandId]);

  useEffect(() => {
    localStorage.setItem("rival_sidebar_collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const activeBrand = useMemo(
    () => brands.find((b) => b.id === activeBrandId) ?? brands[0],
    [activeBrandId, brands]
  );
  const pathCompetitorHost = competitorHostFromDashboardPathname(pathname);
  const queryCompetitorHost = searchParams.get("url")?.trim();
  const activeCompetitorSlug =
    pathCompetitorHost || (queryCompetitorHost ? normalizeCompetitorSlug(queryCompetitorHost) : "");

  const handleCreateBrand = () => {
    const name = window.prompt("Brand name");
    if (!name) return;
    const cleanName = name.trim();
    if (!cleanName) return;
    void (async () => {
      const res = await fetch("/api/account/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        brand?: { id: string; name: string; domain?: string | null; logo_url?: string | null; color?: string | null };
      };
      if (json.ok && json.brand) {
        const mapped = mapApiBrandRow(json.brand);
        setBrands((prev) => [mapped, ...prev.filter((b) => b.id !== mapped.id)]);
        setActiveBrandId(mapped.id);
      }
      setIsBrandMenuOpen(false);
    })();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const collapsed = sidebarCollapsed;

  return (
    <div className="h-screen w-full max-w-full flex flex-col text-[#343434] font-sans selection:bg-[#DDF1FD] selection:text-[#343434] relative overflow-hidden">
      <DemoBanner />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-row">
      {/* Brand gradient background */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(165deg, #e6f7ff 0%, #f0faff 40%, #fffde6 80%, #fffcef 100%)" }} />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[10%] h-[500px] w-[500px] rounded-full bg-[#FFF4CB]/20 blur-[120px]" />
        <div className="absolute right-[-10%] top-[20%] h-[400px] w-[400px] rounded-full bg-[#DDF1FD]/30 blur-[100px]" />
      </div>

      {/* Sidebar */}
      <aside
        className={`hidden sm:flex flex-col h-full min-h-0 sticky top-0 shrink-0 bg-white/80 backdrop-blur-xl border-r border-[#e8e8e8] shadow-[0_4px_24px_rgba(0,0,0,0.04)] motion-safe:transition-[width,min-width] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none z-20 overflow-x-hidden overflow-y-hidden ${
          collapsed ? "w-[92px] min-w-[92px]" : "w-[280px] min-w-[280px]"
        }`}
      >
        {/* Top: Rival logo — compact rail needs enough width so the wordmark is not crushed */}
        <div className={`shrink-0 ${collapsed ? "px-3 pt-5 pb-2.5 flex justify-center" : "px-4 pt-5 pb-2.5"}`}>
          <Link
            href="/"
            className={`inline-flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity leading-none ${
              collapsed ? "w-full max-w-[68px]" : ""
            }`}
          >
            <RivalLogoImg
              className={
                collapsed
                  ? "h-6 w-full max-w-full object-contain object-center"
                  : "h-[22px] w-auto max-w-[120px] object-contain object-left sm:h-6"
              }
            />
          </Link>
        </div>
        {/* Your brand switcher */}
        <div className={`shrink-0 relative ${collapsed ? "px-3 pt-1 pb-2" : "px-4 pt-1 pb-2"}`}>
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
                setIsBrandMenuOpen(true);
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
          ) : (
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
          )}

          {isBrandMenuOpen && (
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
              <div className="border-t border-white/60 mt-2 pt-2 px-2">
                <button
                  type="button"
                  onClick={handleCreateBrand}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl hover:bg-[#DDF1FD]/30 text-[13px] font-medium text-[#343434] transition-colors border border-dashed border-[#DDF1FD]/60 hover:border-[#DDF1FD]"
                >
                  <Plus className="w-4 h-4" /> Add brand
                </button>
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
              className={`flex items-center rounded-xl transition-colors duration-200 ${
                pathname === "/dashboard/spy" || pathname === "/dashboard/searching"
                  ? collapsed
                    ? "bg-[color:var(--rival-accent-blue)]/70 text-[color:var(--rival-primary)] ring-1 ring-[color:var(--rival-accent-blue)]"
                    : "bg-[color:var(--rival-accent-blue)]/70 text-[color:var(--rival-primary)] ring-1 ring-[color:var(--rival-accent-blue)]"
                  : "border border-transparent bg-white/50 text-[#52525b] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-white/90 hover:text-[color:var(--rival-primary)] hover:border-[#e8e8e8]/90"
              } ${collapsed ? "size-11 shrink-0 justify-center" : "gap-3 px-3 py-2.5 w-full"}`}
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
              <span className="text-[10px] font-semibold tabular-nums shrink-0 text-[#b4b4b8]">
                {filteredSidebarRows.length === sidebarCompetitorRows.length
                  ? sidebarCompetitorRows.length
                  : `${filteredSidebarRows.length}/${sidebarCompetitorRows.length}`}
              </span>
            </div>
          )}
          {!collapsed && (
            <div className="relative px-3">
              <Search
                className="pointer-events-none absolute left-5 top-1/2 z-[1] h-[14px] w-[14px] -translate-y-1/2 text-[#a1a1aa]"
                strokeWidth={2.25}
                aria-hidden
              />
              <input
                ref={competitorSearchRef}
                type="search"
                value={competitorFilter}
                onChange={(e) => setCompetitorFilter(e.target.value)}
                placeholder="Filter by name or domain…"
                autoComplete="off"
                spellCheck={false}
                className="h-9 w-full rounded-[10px] border border-white/70 bg-white/55 py-0 pl-8 pr-2 text-[12px] font-medium text-[#343434] placeholder:text-[#c4c4c4] shadow-sm outline-none ring-0 transition-colors focus:border-[#DDF1FD] focus:bg-white/90 focus:ring-2 focus:ring-[#DDF1FD]/50"
              />
            </div>
          )}
          {collapsed && (
            <div className="mx-auto my-2.5 h-px w-9 shrink-0 rounded-full bg-[#e5e7eb]" aria-hidden />
          )}
        </div>

        {/* Competitor list only — scrolls */}
        <div
          className={`rival-subtle-scroll flex-1 min-h-0 overflow-y-auto ${collapsed ? "px-3" : "px-4"} pb-2 pt-1`}
        >
          <div className={collapsed ? "flex flex-col items-center gap-2.5" : "space-y-1.5"}>
            {!collapsed &&
              competitorFilter.trim() &&
              filteredSidebarRows.length === 0 &&
              sidebarCompetitorRows.length > 0 && (
                <p className="px-3 py-2 text-center text-[12px] font-medium leading-snug text-[#a1a1aa]">
                  No matches — try another search or{" "}
                  <Link href="/dashboard/spy" className="text-[#1e6fa8] underline-offset-2 hover:underline">
                    find competitor
                  </Link>
                </p>
              )}
            {rowsToRender.map((competitor, competitorIdx) => {
              const urlHost = coerceSidebarCompetitorUrlHost(competitor);
              const rowSlug = urlHost || normalizeCompetitorSlug(competitor.slug);
              const rowReactKey = `${normalizeCompetitorSlug(competitor.slug)}:${competitorIdx}`;
              const onCompetitorView =
                pathname.startsWith("/dashboard/competitor/") || pathname === "/dashboard/competitor";
              const isActive =
                onCompetitorView && activeCompetitorSlug !== "" && activeCompetitorSlug === rowSlug;
              if (competitor.pending) {
                return (
                  <div
                    key={`pending-${rowReactKey}`}
                    className={`rounded-xl transition-colors ${
                      isActive
                        ? "bg-[color:var(--rival-accent-blue)]/35 ring-1 ring-[color:var(--rival-accent-blue)]/50"
                        : ""
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
              return (
                <Link
                  key={rowReactKey}
                  href={href}
                  className={`flex items-center rounded-xl transition-colors ${
                    isActive
                      ? "bg-[color:var(--rival-accent-blue)]/50 text-[color:var(--rival-primary)] ring-1 ring-[color:var(--rival-accent-blue)]/70"
                      : "text-[#52525b] hover:bg-white/75 hover:text-[color:var(--rival-primary)]"
                  } ${collapsed ? "size-11 shrink-0 justify-center" : "gap-3 px-3 py-3"}`}
                  title={competitor.name}
                >
                  <SidebarCompetitorAvatar competitor={competitor} collapsed={collapsed} />
                  {!collapsed && (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium leading-snug">{competitor.name}</p>
                      <p className="truncate text-[12px] leading-snug text-[color:var(--rival-muted)]">{urlHost}</p>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bottom: user identity, sign out, collapse */}
        <div className={`shrink-0 border-t border-[#e8e8e8]/90 ${collapsed ? "px-3 py-2.5" : "px-4 py-2.5"}`}>
          <div className={collapsed ? "flex flex-col items-center gap-2" : "space-y-1"}>
            {userProfile ? (
              <button
                type="button"
                onClick={() => router.push("/dashboard/settings")}
                className={
                  collapsed
                    ? "flex size-11 shrink-0 items-center justify-center rounded-full bg-[#6366f1] text-white text-[11px] font-bold overflow-hidden hover:ring-2 hover:ring-[#DDF1FD] transition-all"
                    : "flex w-full items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[#f4f4f5] transition-colors text-left"
                }
                title={userProfile.full_name || userProfile.email || "Account"}
              >
                {userProfile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={userProfile.avatar_url}
                    alt=""
                    className={collapsed ? "size-11 object-cover" : "w-7 h-7 rounded-full object-cover shrink-0"}
                  />
                ) : (
                  <span
                    className={
                      collapsed
                        ? "flex size-11 items-center justify-center"
                        : "w-7 h-7 rounded-full bg-[#6366f1] flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                    }
                  >
                    {(userProfile.full_name?.[0] ?? userProfile.email?.[0] ?? "?").toUpperCase()}
                  </span>
                )}
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-[#1a1a2e] truncate">
                      {userProfile.full_name?.trim() || userProfile.email}
                    </p>
                    {userProfile.company_name ? (
                      <p className="text-[11px] text-[#71717a] truncate">{userProfile.company_name}</p>
                    ) : null}
                  </div>
                )}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleSignOut}
              className={`flex items-center rounded-xl text-[#52525b] transition-colors hover:bg-white/75 hover:text-[color:var(--rival-primary)] ${
                collapsed ? "size-11 shrink-0 justify-center" : "gap-3 px-3 py-2.5 w-full"
              }`}
              title="Sign out"
            >
              <LogOut className={`shrink-0 ${collapsed ? "w-[18px] h-[18px]" : "w-[18px] h-[18px]"}`} />
              {!collapsed && <span className="text-[14px] font-medium">Sign out</span>}
            </button>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`flex items-center rounded-xl text-[color:var(--rival-muted)] transition-colors hover:bg-white/75 hover:text-[#52525b] ${
                collapsed ? "size-11 shrink-0 justify-center" : "gap-3 px-3 py-2.5 w-full"
              }`}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronsRight className="w-[18px] h-[18px] shrink-0" />
              ) : (
                <>
                  <ChevronsLeft className="w-[18px] h-[18px] shrink-0" />
                  <span className="text-[14px] font-medium">Collapse</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="rival-subtle-scroll flex-1 flex flex-col relative min-w-0 overflow-x-hidden overflow-y-auto z-10">
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
                    router.push("/dashboard/spy");
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
            <div key={pathname} className="rival-dashboard-route-shell flex min-h-0 min-w-0 flex-1 flex-col">
              {children}
            </div>
          </BrandProvider>
        </div>
      </main>
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
