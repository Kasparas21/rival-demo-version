"use client";

import {
  COMPETITOR_PAGE_TABS,
  type CompetitorPageTabId,
} from "@/components/dashboard/competitor/competitor-tabs-data";

/** Top-level hero demo pillars — matches landing feature story (spy → analyze → monitor). */
export const DEMO_FEATURE_TAB_IDS: CompetitorPageTabId[] = ["ads library", "insights", "alerts"];

const DEMO_FEATURE_TABS = COMPETITOR_PAGE_TABS.filter((tab) => DEMO_FEATURE_TAB_IDS.includes(tab.id));

type Props = {
  activeTab: CompetitorPageTabId;
  onTabChange: (tab: CompetitorPageTabId) => void;
};

/** Segmented pill above the demo — equal columns, active fill on the tab itself. */
export function HeroVariantBDemoFeatureSwitch({ activeTab, onTabChange }: Props) {
  return (
    <div className="mb-4 flex justify-center px-3 sm:mb-5 sm:px-4">
      <div
        role="tablist"
        aria-label="Product features"
        className="grid w-full max-w-[min(100%,22rem)] grid-cols-3 gap-1 rounded-full border border-[#4a7fa5]/25 bg-white/85 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_12px_36px_-12px_rgba(74,127,165,0.22)] backdrop-blur-xl sm:max-w-md sm:gap-1.5 sm:p-1.5"
      >
        {DEMO_FEATURE_TABS.map((tab) => {
          const active = tab.id === activeTab;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(tab.id)}
              className={`flex min-w-0 items-center justify-center gap-1 rounded-full px-1.5 py-2 text-[10px] font-semibold leading-none tracking-[-0.01em] transition-[color,background-color,box-shadow] duration-200 sm:gap-1.5 sm:px-2 sm:py-2.5 sm:text-xs ${
                active
                  ? "bg-gradient-to-b from-[#5a8fb3] to-[#4a7fa5] text-white shadow-[0_4px_12px_-4px_rgba(74,127,165,0.55)]"
                  : "text-[#64748b] hover:bg-white/60 hover:text-[#4a7fa5]"
              }`}
            >
              <Icon className="size-3 shrink-0 sm:size-3.5" aria-hidden />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
