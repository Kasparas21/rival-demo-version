"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

import {
  COMPETITOR_PAGE_TABS,
  type CompetitorPageTabId,
  type CompetitorSubTabId,
} from "@/components/dashboard/competitor/competitor-tabs-data";
import { HeroVariantBDemoShell } from "@/components/landing/hero-variant-b-demo/chrome";
import type { DemoPlatform } from "@/lib/landing/hero-variant-b-demo-data";
import {
  DemoActivityScoreMarketingView,
  DemoMondayDigestMarketingView,
  DemoPlatformPrioritizationMarketingView,
  DemoStealableAnglesMarketingView,
  DemoThreeMovesMarketingView,
} from "@/components/marketing/demos/extra-feature-demos";

const DemoAdLibraryView = dynamic(
  () =>
    import("@/components/landing/hero-variant-b-demo/ad-library-view").then((m) => ({
      default: m.DemoAdLibraryView,
    })),
  { ssr: false },
);

const DemoInsightsView = dynamic(
  () =>
    import("@/components/landing/hero-variant-b-demo/other-views").then((m) => ({
      default: m.DemoInsightsView,
    })),
  { ssr: false },
);

const DemoTestsTimelineView = dynamic(
  () =>
    import("@/components/landing/hero-variant-b-demo/other-views").then((m) => ({
      default: m.DemoTestsTimelineView,
    })),
  { ssr: false },
);

const DemoAudienceCopyView = dynamic(
  () =>
    import("@/components/landing/hero-variant-b-demo/other-views").then((m) => ({
      default: m.DemoAudienceCopyView,
    })),
  { ssr: false },
);

const DemoComparisonView = dynamic(
  () =>
    import("@/components/landing/hero-variant-b-demo/other-views").then((m) => ({
      default: m.DemoComparisonView,
    })),
  { ssr: false },
);

export type MarketingFeatureDemoId =
  | "ad-library"
  | "strategy-map"
  | "three-moves"
  | "stealable-angles"
  | "copy-vault"
  | "timeline"
  | "activity-score"
  | "audience-inference"
  | "monday-digest"
  | "platform-prioritization";

type FeatureDemoConfig = {
  mainTab: CompetitorPageTabId;
  subTab: CompetitorSubTabId;
  useShell: boolean;
  customView?: "three-moves" | "stealable-angles" | "monday-digest" | "platform-prioritization" | "activity-score";
};

const FEATURE_DEMO_CONFIG: Record<MarketingFeatureDemoId, FeatureDemoConfig> = {
  "ad-library": { mainTab: "ads library", subTab: "all", useShell: true },
  "strategy-map": { mainTab: "insights", subTab: "strategy-map", useShell: true },
  "three-moves": { mainTab: "comparison", subTab: "all", useShell: false, customView: "three-moves" },
  "stealable-angles": { mainTab: "comparison", subTab: "all", useShell: false, customView: "stealable-angles" },
  "copy-vault": { mainTab: "audience-copy", subTab: "copy-vault", useShell: true },
  timeline: { mainTab: "tests", subTab: "timeline", useShell: true },
  "activity-score": { mainTab: "insights", subTab: "activity-feed", useShell: false, customView: "activity-score" },
  "audience-inference": { mainTab: "audience-copy", subTab: "audience", useShell: true },
  "monday-digest": { mainTab: "alerts", subTab: "all", useShell: false, customView: "monday-digest" },
  "platform-prioritization": {
    mainTab: "ads library",
    subTab: "all",
    useShell: false,
    customView: "platform-prioritization",
  },
};

function DemoViewFallback() {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-[#e5e7eb] bg-white/80">
      <p className="text-[12px] text-[#94a3b8]">Loading interactive demo…</p>
    </div>
  );
}

function renderCustomView(view: FeatureDemoConfig["customView"]) {
  switch (view) {
    case "three-moves":
      return <DemoThreeMovesMarketingView />;
    case "stealable-angles":
      return <DemoStealableAnglesMarketingView />;
    case "monday-digest":
      return <DemoMondayDigestMarketingView />;
    case "platform-prioritization":
      return <DemoPlatformPrioritizationMarketingView />;
    case "activity-score":
      return <DemoActivityScoreMarketingView />;
    default:
      return null;
  }
}

function renderShellView(
  mainTab: CompetitorPageTabId,
  subTab: CompetitorSubTabId,
  savedIds: Set<string>,
  onToggleSave: (id: string) => void,
  lockedPlatform?: DemoPlatform,
) {
  switch (mainTab) {
    case "ads library":
      return (
        <DemoAdLibraryView
          subTab={subTab === "saved" ? "saved" : "all"}
          savedIds={savedIds}
          onToggleSave={onToggleSave}
          lockedPlatform={lockedPlatform}
        />
      );
    case "insights":
      return <DemoInsightsView subTab={subTab === "activity-feed" ? "activity-feed" : "strategy-map"} />;
    case "tests":
      return (
        <DemoTestsTimelineView
          subTab={
            subTab === "timeline" ? "timeline" : subTab === "landing-pages" ? "landing-pages" : "creative-tests"
          }
        />
      );
    case "audience-copy":
      return <DemoAudienceCopyView subTab={subTab === "copy-vault" ? "copy-vault" : "audience"} />;
    case "comparison":
      return <DemoComparisonView />;
    default:
      return <DemoViewFallback />;
  }
}

type Props =
  | { mode: "feature"; featureId: MarketingFeatureDemoId }
  | { mode: "adspy"; lockedPlatform: DemoPlatform };

export function MarketingProductDemo(props: Props) {
  const config =
    props.mode === "feature"
      ? FEATURE_DEMO_CONFIG[props.featureId]
      : { mainTab: "ads library" as const, subTab: "all" as const, useShell: true };

  const [mainTab, setMainTab] = useState<CompetitorPageTabId>(config.mainTab);
  const [subTab, setSubTab] = useState<CompetitorSubTabId>(config.subTab);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const lockedPlatform = props.mode === "adspy" ? props.lockedPlatform : undefined;

  const inner =
    props.mode === "feature" && config.customView ? (
      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm sm:p-6">
        {renderCustomView(config.customView)}
      </div>
    ) : (
      renderShellView(mainTab, subTab, savedIds, toggleSave, lockedPlatform)
    );

  if (props.mode === "feature" && !config.useShell) {
    return (
      <div className="w-full" data-marketing-demo>
        {inner}
      </div>
    );
  }

  return (
    <div data-marketing-demo className="w-full">
      <HeroVariantBDemoShell
        mainTab={mainTab}
        subTab={subTab}
        onMainTab={(tab) => {
          setMainTab(tab);
          const def = COMPETITOR_PAGE_TABS.find((t) => t.id === tab);
          setSubTab(def?.defaultSubTab ?? "all");
        }}
        onSubTab={setSubTab}
      >
        {inner}
      </HeroVariantBDemoShell>
    </div>
  );
}
