"use client";

import { Lock } from "lucide-react";
import { useEffect, useState, type RefObject } from "react";

import { AlertUnreadCountBadge } from "@/components/competitor/alerts/alert-ui-styles";
import { COMPETITOR_PAGE_X } from "@/components/dashboard/competitor/competitor-page-layout";
import {
  competitorSubTabsForView,
  competitorTabNewBadgeClass,
  findCompetitorTab,
  isGlobalDebugOnlyTab,
  isOwnBrandDebugOnlyTab,
  isOwnBrandDebugOnlySubTab,
  type CompetitorPageTab,
  type CompetitorSubTab,
  type CompetitorSubTabId,
} from "@/components/dashboard/competitor/competitor-tabs-data";
import { CompetitorLogo } from "@/components/shared/competitor-logo";
import { cn } from "@/lib/utils";

const COMPACT_NAV_REVEAL_PX = 64;

export type CompactNavScrollState = {
  /** 0 = full header only, 1 = compact bar fully shown */
  progress: number;
  visible: boolean;
};

export function useCompactNavScroll(
  sentinelRef: RefObject<HTMLElement | null>,
): CompactNavScrollState {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const root = el.closest("main") as HTMLElement | null;
    let raf = 0;

    const measure = () => {
      raf = 0;
      const sentinelTop = el.getBoundingClientRect().top;
      const rootTop = root?.getBoundingClientRect().top ?? 0;
      const relativeTop = sentinelTop - rootTop;

      let next = 0;
      if (relativeTop <= 0) {
        next = 1;
      } else if (relativeTop < COMPACT_NAV_REVEAL_PX) {
        next = 1 - relativeTop / COMPACT_NAV_REVEAL_PX;
      }

      setProgress(next);
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(measure);
    };

    const scrollTarget = root ?? window;
    scrollTarget.addEventListener("scroll", onScroll, { passive: true });
    measure();

    return () => {
      scrollTarget.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [sentinelRef]);

  return { progress, visible: progress > 0.08 };
}

type CompetitorCompactStickyNavProps = {
  progress: number;
  competitorDisplayLabel: string;
  brand: {
    logoUrl: string | null;
    domain: string | null;
  };
  isOwnWorkspace: boolean;
  showBrandDebugTabs: boolean;
  pageTabs: CompetitorPageTab[];
  navTab: string;
  navSub: string | null;
  alertsUnreadCount: number;
  onTabChange: (tabId: string) => void;
  onSubTabChange: (subTabId: CompetitorSubTabId) => void;
};

export function CompetitorCompactStickyNav({
  progress,
  competitorDisplayLabel,
  brand,
  isOwnWorkspace,
  showBrandDebugTabs,
  pageTabs,
  navTab,
  navSub,
  alertsUnreadCount,
  onTabChange,
  onSubTabChange,
}: CompetitorCompactStickyNavProps) {
  const currentTab = findCompetitorTab(navTab);
  const visibleSubTabs: CompetitorSubTab[] = currentTab?.subTabs?.length
    ? competitorSubTabsForView({
        parentTab: currentTab,
        isOwnWorkspace,
        showDebugTabs: showBrandDebugTabs,
      })
    : [];

  const eased = progress * progress * (3 - 2 * progress);
  const translateY = (1 - eased) * -100;
  const scale = 0.94 + eased * 0.06;
  const interactive = progress > 0.12;

  return (
    <div className="sticky top-0 z-30 h-0 w-full overflow-visible">
      <div
        className={cn(
          "absolute inset-x-0 top-0 border-b backdrop-blur-xl will-change-[transform,opacity]",
          isOwnWorkspace
            ? "border-sky-200/90 bg-white/95"
            : "border-white/70 bg-white/95",
          interactive ? "shadow-[0_4px_24px_rgba(15,23,42,0.08)]" : "shadow-none",
        )}
        style={{
          opacity: eased,
          transform: `translate3d(0, ${translateY}%, 0) scale(${scale})`,
          transformOrigin: "top center",
          pointerEvents: interactive ? "auto" : "none",
        }}
        aria-hidden={!interactive}
      >
        <div
          className={cn(
            "flex min-h-[52px] items-center gap-3 py-2",
            isOwnWorkspace ? "pl-5 pr-4 sm:pl-6 sm:pr-5" : COMPETITOR_PAGE_X,
          )}
        >
          <div
            className="flex min-w-0 shrink-0 items-center gap-2.5 transition-[gap] duration-200"
            style={{ gap: `${8 + eased * 2}px` }}
          >
            <div
              className="origin-left transition-transform duration-200 motion-reduce:transition-none"
              style={{ transform: `scale(${0.88 + eased * 0.12})` }}
            >
              <CompetitorLogo
                sources={{
                  primary: brand.logoUrl,
                  secondary: null,
                  domain: brand.domain,
                }}
                name={competitorDisplayLabel}
                size="sm"
                shape="rounded"
                className={
                  isOwnWorkspace
                    ? "border border-sky-200/90 shadow-sm"
                    : "border border-[#e0e3e8] shadow-sm"
                }
              />
            </div>
            <p
              className="hidden truncate text-[13px] font-semibold text-[#343434] sm:block md:max-w-[160px]"
              style={{
                opacity: eased,
                maxWidth: `${80 + eased * 80}px`,
              }}
            >
              {competitorDisplayLabel}
            </p>
          </div>

          <nav
            className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Competitor sections"
          >
            {pageTabs.map((tab) => {
              const isActive = navTab === tab.id;
              const isDisabled = tab.disabled === true;
              const isDebugOnlyTab =
                showBrandDebugTabs &&
                (isGlobalDebugOnlyTab(tab.id) ||
                  (isOwnWorkspace && isOwnBrandDebugOnlyTab(tab.id)));
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  disabled={isDisabled}
                  aria-disabled={isDisabled}
                  aria-current={isActive ? "page" : undefined}
                  title={isDisabled ? "Coming soon" : tab.label}
                  onClick={() => {
                    if (isDisabled) return;
                    onTabChange(tab.id);
                  }}
                  className={cn(
                    "relative inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium whitespace-nowrap transition-colors sm:px-3 sm:text-[13px]",
                    isDisabled
                      ? "cursor-not-allowed text-[#b8beca] opacity-60"
                      : isActive
                        ? isOwnWorkspace
                          ? "bg-sky-100 text-sky-950"
                          : "bg-slate-900 text-white"
                        : "text-[#6b7280] hover:bg-slate-100 hover:text-[#343434]",
                  )}
                >
                  {isDebugOnlyTab ? (
                    <span
                      className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400"
                      aria-hidden
                    />
                  ) : null}
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.isNew ? (
                    <span className={cn(competitorTabNewBadgeClass, "scale-90")} aria-label="New feature">
                      New
                    </span>
                  ) : null}
                  {tab.id === "alerts" && alertsUnreadCount > 0 ? (
                    <AlertUnreadCountBadge count={alertsUnreadCount} className="ml-0.5 scale-90" />
                  ) : null}
                  {isDisabled ? <Lock className="h-3 w-3 shrink-0 text-[#b8beca]" aria-hidden /> : null}
                </button>
              );
            })}
          </nav>
        </div>

        {visibleSubTabs.length > 0 ? (
          <div
            className="overflow-hidden border-t border-slate-200/80 bg-slate-50/80 transition-[max-height,opacity] duration-200 motion-reduce:transition-none"
            style={{
              opacity: eased,
              maxHeight: `${eased * 48}px`,
            }}
          >
            <div
              className={cn(
                "flex items-center gap-1 overflow-x-auto py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                isOwnWorkspace ? "px-5 sm:px-6" : COMPETITOR_PAGE_X,
              )}
            >
              {visibleSubTabs.map((st) => {
                const isSubActive = navSub === st.id;
                const isDebugOnlySubTab =
                  isOwnWorkspace && showBrandDebugTabs && isOwnBrandDebugOnlySubTab(navTab, st.id);

                return (
                  <button
                    key={st.id}
                    type="button"
                    aria-current={isSubActive ? "true" : undefined}
                    onClick={() => onSubTabChange(st.id)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors sm:text-[12px]",
                      isSubActive
                        ? "bg-slate-800 text-white"
                        : "text-slate-600 hover:bg-slate-200/70",
                    )}
                  >
                    {isDebugOnlySubTab ? (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden />
                    ) : null}
                    {st.label}
                    {st.isNew ? (
                      <span
                        className={cn(
                          "rounded-full px-1 py-0.5 text-[8px] font-bold",
                          isSubActive ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700",
                        )}
                      >
                        NEW
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CompetitorHeaderScrollSentinel({
  sentinelRef,
}: {
  sentinelRef: RefObject<HTMLDivElement | null>;
}) {
  return <div ref={sentinelRef} className="pointer-events-none h-px w-full shrink-0" aria-hidden />;
}
