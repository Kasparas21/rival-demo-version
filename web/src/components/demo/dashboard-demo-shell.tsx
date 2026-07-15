"use client";

import type { ReactNode } from "react";
import { Clock } from "lucide-react";

import {
  competitorSubTabsForView,
  findCompetitorTab,
  type CompetitorPageTab,
  type CompetitorPageTabId,
  type CompetitorSubTabId,
} from "@/components/dashboard/competitor/competitor-tabs-data";
import { COMPETITOR_PAGE_SHELL, COMPETITOR_PAGE_X } from "@/components/dashboard/competitor/competitor-page-layout";
import { demoBrandForDomain } from "@/lib/demo/dashboard-demo-config";

function DemoBrandLogo({ logoUrl, isOwnWorkspace }: { logoUrl: string; isOwnWorkspace: boolean }) {
  return (
    <span
      className={`inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ${
        isOwnWorkspace ? "border-2 border-sky-200/90 ring-2 ring-sky-100/80" : "border border-[#e0e3e8]"
      }`}
      aria-hidden
    >
      <img src={logoUrl} alt="" className="size-9 object-contain" />
    </span>
  );
}

type ShellProps = {
  domain: string;
  mainTab: CompetitorPageTabId;
  subTab: CompetitorSubTabId;
  pageTabs: CompetitorPageTab[];
  onMainTab: (tab: CompetitorPageTabId) => void;
  onSubTab: (sub: CompetitorSubTabId) => void;
  children: ReactNode;
};

export function DashboardDemoShell({
  domain,
  mainTab,
  subTab,
  pageTabs,
  onMainTab,
  onSubTab,
  children,
}: ShellProps) {
  const brand = demoBrandForDomain(domain);
  const isOwnWorkspace = brand.isOwnWorkspace;
  const currentTab = findCompetitorTab(mainTab);
  const visibleSubTabs =
    currentTab != null
      ? competitorSubTabsForView({
          parentTab: currentTab,
          isOwnWorkspace,
          showDebugTabs: true,
        })
      : [];

  return (
    <div className="flex w-full flex-col">
      <div
        className={`relative border-b backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.5)] ${
          isOwnWorkspace
            ? "border-sky-200/90 bg-gradient-to-br from-sky-50/95 via-amber-50/30 to-white/[0.92]"
            : "border-white/60 bg-white/70"
        }`}
      >
        {isOwnWorkspace ? (
          <div
            className="pointer-events-none absolute bottom-5 left-0 top-5 w-1 rounded-r-full bg-sky-500/85"
            aria-hidden
          />
        ) : null}
        <div
          className={`pb-0 pr-4 sm:pr-5 pt-6 sm:pt-7 ${isOwnWorkspace ? "pl-5 sm:pl-6" : COMPETITOR_PAGE_X}`}
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <DemoBrandLogo logoUrl={brand.logoUrl} isOwnWorkspace={isOwnWorkspace} />
              <div className="flex h-12 min-w-0 flex-col justify-between pt-px">
                <div className="flex min-w-0 flex-wrap items-center gap-2 leading-none">
                  <h1 className="truncate text-[20px] font-bold leading-none tracking-[-0.02em] text-[#343434] sm:text-[24px]">
                    {brand.name}
                  </h1>
                  {isOwnWorkspace ? (
                    <span className="shrink-0 rounded-full bg-sky-600/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-sky-900">
                      Your brand
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1.5 leading-none">
                  <Clock
                    className={`size-3.5 shrink-0 ${isOwnWorkspace ? "text-sky-700/70" : "text-[#a1a1aa]"}`}
                  />
                  <span className={`text-[13px] ${isOwnWorkspace ? "text-sky-900/80" : "text-[#71717a]"}`}>
                    Last scraped {brand.lastScraped}
                    {!isOwnWorkspace && brand.lastSpyRun ? (
                      <span className="hidden sm:inline"> · Last spy run: {brand.lastSpyRun}</span>
                    ) : null}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <nav className={`-mb-px flex w-full gap-0 overflow-x-auto ${COMPETITOR_PAGE_X}`}>
            {pageTabs.map((tab) => {
              const isActive = mainTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onMainTab(tab.id)}
                  className={`relative flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-[14px] font-medium transition-colors ${
                    isActive
                      ? isOwnWorkspace
                        ? "border-sky-600 text-slate-900"
                        : "border-[#343434] text-[#343434]"
                      : "border-transparent text-[#6b7280] hover:border-[#DDF1FD] hover:text-[#343434]"
                  }`}
                >
                  <Icon
                    className={`size-4 shrink-0 ${
                      isActive
                        ? isOwnWorkspace
                          ? "text-sky-700"
                          : "text-[#343434]"
                        : "text-[#9ca3af]"
                    }`}
                  />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {visibleSubTabs.length > 0 ? (
            <div className="w-full border-b border-slate-200 bg-slate-50/50">
              <div className={`flex w-full items-center gap-1 overflow-x-auto py-2 ${COMPETITOR_PAGE_X}`}>
                {visibleSubTabs.map((st) => {
                  const isSubActive = subTab === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => onSubTab(st.id)}
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        isSubActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className={COMPETITOR_PAGE_SHELL}>{children}</div>
    </div>
  );
}
