"use client";

import type { ReactNode } from "react";

import {
  COMPETITOR_PAGE_TABS,
  type CompetitorPageTabId,
  type CompetitorSubTabId,
} from "@/components/dashboard/competitor/competitor-tabs-data";
import { DemoAnimatedBody } from "@/components/landing/hero-variant-b-demo/demo-animated-body";
import { DemoLiveNotifications } from "@/components/landing/hero-variant-b-demo/demo-live-notifications";
import { DemoMobileScrollRow } from "@/components/landing/hero-variant-b-demo/demo-mobile-scroll-row";
import { DEMO_COMPETITOR } from "@/lib/landing/hero-variant-b-demo-data";

export function GenericLogo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#94a3b8] to-[#64748b] text-xs font-bold text-white ${className}`.trim()}
      aria-hidden
    >
      A
    </span>
  );
}

type ShellProps = {
  mainTab: CompetitorPageTabId;
  subTab: CompetitorSubTabId;
  onMainTab: (tab: CompetitorPageTabId) => void;
  onSubTab: (sub: CompetitorSubTabId) => void;
  children: ReactNode;
};

export function HeroVariantBDemoShell({
  mainTab,
  subTab,
  onMainTab,
  onSubTab,
  children,
}: ShellProps) {
  const tabDef = COMPETITOR_PAGE_TABS.find((t) => t.id === mainTab);

  return (
    <div className="hero-variant-b-product-demo relative mx-auto w-full max-w-6xl px-2 sm:px-4 md:px-6">
      <div className="relative overflow-hidden rounded-xl border border-[#e5e7eb]/90 bg-white shadow-[0_0_0_1px_rgba(74,127,165,0.06),0_20px_56px_-14px_rgba(26,26,26,0.14)] sm:rounded-2xl md:rounded-[1.25rem]">
        <div className="hero-variant-b-demo-chrome-header border-b border-[#e5e7eb] bg-white px-3 py-3 text-left sm:px-5 sm:py-3.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <GenericLogo className="size-9 rounded-xl text-sm sm:size-10" />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-[#111827] sm:text-base">
                  {DEMO_COMPETITOR.name}
                </p>
                <p className="text-[10px] leading-snug text-[#64748b] sm:text-[11px]">
                  Last scraped {DEMO_COMPETITOR.lastScraped}
                  <span className="hidden sm:inline"> · Last spy run: {DEMO_COMPETITOR.lastSpyRun}</span>
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-full border border-[#e5e7eb] bg-[#f8fafc] px-2.5 py-1.5 text-[10px] font-medium text-[#475569] sm:px-3 sm:text-[11px]">
              <span className="size-2 rounded-full bg-green-500" aria-hidden />
              Monitoring on
            </div>
          </div>

          <DemoMobileScrollRow
            role="tablist"
            ariaLabel="Product sections"
            className="mt-3 -mx-1"
            desktopClassName="md:gap-1"
          >
            {COMPETITOR_PAGE_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = tab.id === mainTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onMainTab(tab.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-medium transition-colors sm:px-3 sm:text-xs ${
                    active
                      ? "bg-[#eff6ff] text-[#1d4ed8] ring-1 ring-[#bfdbfe]"
                      : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#334155]"
                  }`}
                >
                  <Icon className="size-3.5 shrink-0 sm:size-4" aria-hidden />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </DemoMobileScrollRow>

          {tabDef?.subTabs?.length ? (
            <DemoMobileScrollRow
              className="mt-3 border-t border-[#e5e7eb]/80 pt-3"
              desktopClassName="md:flex-wrap md:overflow-visible"
            >
              {tabDef.subTabs.map((st) => {
                const active = st.id === subTab;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => onSubTab(st.id)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors sm:text-xs ${
                      active
                        ? "bg-[#1e293b] text-white shadow-sm"
                        : "bg-white text-[#64748b] ring-1 ring-[#e5e7eb] hover:text-[#334155]"
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </DemoMobileScrollRow>
          ) : null}
        </div>

        <div className="relative">
          <DemoLiveNotifications />
          <DemoAnimatedBody contentKey={`${mainTab}:${subTab}`}>
            <div className="hero-variant-b-demo-content-zoom-host">
              <div className="hero-variant-b-demo-content-zoom px-3 py-4 text-left sm:px-5 sm:py-6 md:px-6">
                {children}
              </div>
            </div>
          </DemoAnimatedBody>
        </div>
      </div>
    </div>
  );
}

export function DemoSectionHeader({
  overline,
  title,
  description,
  action,
}: {
  overline?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {overline ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748b]">{overline}</p>
        ) : null}
        <h3 className="mt-1 text-[16px] font-semibold text-[#111827] sm:text-lg">{title}</h3>
        {description ? <p className="mt-1 text-[12px] leading-relaxed text-[#64748b]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function DemoPillFilters({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors sm:text-xs ${
            value === opt.id
              ? "bg-[#1e293b] text-white"
              : "bg-white text-[#64748b] ring-1 ring-[#e5e7eb] hover:text-[#334155]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
