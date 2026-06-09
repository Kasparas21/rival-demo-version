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

/** Segmented pill above the demo — Spy Rival glass + blue accent on the hero wash. */
export function HeroVariantBDemoFeatureSwitch({ activeTab, onTabChange }: Props) {
  const activeIndex = DEMO_FEATURE_TABS.findIndex((tab) => tab.id === activeTab);
  const showActivePill = activeIndex >= 0;

  return (
    <div className="mb-4 flex justify-center px-1 sm:mb-5 sm:px-2">
      <div
        role="tablist"
        aria-label="Product features"
        className="relative inline-flex max-w-full overflow-x-auto rounded-full border border-[#4a7fa5]/28 bg-white/78 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_14px_44px_-14px_rgba(74,127,165,0.28)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {showActivePill ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1 bottom-1 rounded-full bg-gradient-to-r from-[#4a7fa5] to-[#35688a] shadow-[0_4px_14px_-4px_rgba(74,127,165,0.5)] transition-[left] duration-300 ease-out"
            style={{
              width: `calc((100% - 8px) / ${DEMO_FEATURE_TABS.length})`,
              left: `calc(4px + ${activeIndex} * ((100% - 8px) / ${DEMO_FEATURE_TABS.length}))`,
            }}
          />
        ) : null}

        {DEMO_FEATURE_TABS.map((tab, index) => {
          const active = tab.id === activeTab;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(tab.id)}
              className={`relative z-[1] flex shrink-0 items-center gap-1.5 px-4 py-2 text-[11px] font-semibold tracking-[-0.01em] transition-colors sm:px-5 sm:py-2.5 sm:text-xs ${
                index > 0 ? "before:absolute before:inset-y-2 before:left-0 before:z-0 before:w-px before:bg-[#4a7fa5]/14" : ""
              } ${
                active
                  ? "text-white"
                  : "text-[#64748b] hover:text-[#4a7fa5]"
              }`}
            >
              <Icon className="size-3.5 shrink-0 sm:size-4" aria-hidden />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
