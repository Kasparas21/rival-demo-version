import {
  BarChart3,
  Beaker,
  Bell,
  Gauge,
  GitCompareArrows,
  Library,
  SlidersHorizontal,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

export type CompetitorSubTabId =
  | "all"
  | "saved"
  | "strategy-map"
  | "activity-feed"
  | "creative-tests"
  | "timeline"
  | "landing-pages"
  | "audience"
  | "copy-vault";

export type CompetitorPageTabId =
  | "ads library"
  | "insights"
  | "tests"
  | "audience-copy"
  | "comparison"
  | "alerts"
  | "workspace-ads"
  | "workspace-marketing-improvements"
  | "benchmark";

export type CompetitorSubTab = {
  id: CompetitorSubTabId;
  label: string;
  isNew?: boolean;
  isStub?: boolean;
};

export type CompetitorPageTab = {
  id: CompetitorPageTabId;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  subTabs?: CompetitorSubTab[];
  defaultSubTab?: CompetitorSubTabId;
};

export const COMPETITOR_PAGE_TABS: CompetitorPageTab[] = [
  {
    id: "ads library",
    label: "Ad Library",
    icon: Library,
    defaultSubTab: "all",
    subTabs: [
      { id: "all", label: "All Ads" },
      { id: "saved", label: "Saved" },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    icon: BarChart3,
    defaultSubTab: "strategy-map",
    subTabs: [
      { id: "strategy-map", label: "Strategy Map" },
      { id: "activity-feed", label: "Activity Feed", isNew: true },
    ],
  },
  {
    id: "tests",
    label: "Tests & Timeline",
    icon: Beaker,
    defaultSubTab: "creative-tests",
    subTabs: [
      { id: "creative-tests", label: "Creative Tests", isNew: true },
      { id: "timeline", label: "Timeline", isNew: true },
      { id: "landing-pages", label: "Landing Pages", isNew: true },
    ],
  },
  {
    id: "audience-copy",
    label: "Audience & Copy",
    icon: Users,
    defaultSubTab: "audience",
    subTabs: [
      { id: "audience", label: "Audience" },
      { id: "copy-vault", label: "Copy Vault" },
    ],
  },
  {
    id: "comparison",
    label: "Comparison",
    icon: GitCompareArrows,
  },
  {
    id: "alerts",
    label: "Alerts",
    icon: Bell,
  },
];

export function findCompetitorTab(id: string): CompetitorPageTab | undefined {
  return COMPETITOR_PAGE_TABS.find((t) => t.id === id);
}

export function findCompetitorSubTab(parentId: string, subId: string): CompetitorSubTab | undefined {
  const parent = findCompetitorTab(parentId);
  return parent?.subTabs?.find((st) => st.id === subId);
}

/** Shown only on the signed-in user’s own brand hub — ad source URLs / handles (not competitor spy). */
export const WORKSPACE_ADS_TAB: CompetitorPageTab = {
  id: "workspace-ads",
  label: "Workspace ads",
  icon: SlidersHorizontal,
};

/** Cross-competitor coaching for the workspace brand (uses cached Ads Library creative from rivals you follow). */
export const WORKSPACE_MARKETING_IMPROVEMENTS_TAB: CompetitorPageTab = {
  id: "workspace-marketing-improvements",
  label: "Improve marketing",
  icon: TrendingUp,
};

/** Own brand vs all tracked competitors — rank-based benchmark view. */
export const WORKSPACE_BENCHMARK_TAB: CompetitorPageTab = {
  id: "benchmark",
  label: "Benchmark",
  icon: Gauge,
};

/** Own-brand hub tabs hidden until `NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION=true`. */
export const OWN_BRAND_DEBUG_ONLY_TAB_IDS: readonly CompetitorPageTabId[] = [
  "insights",
  "tests",
  "audience-copy",
  "alerts",
  "workspace-marketing-improvements",
];

export function isOwnBrandDebugOnlyTab(tabId: string): tabId is (typeof OWN_BRAND_DEBUG_ONLY_TAB_IDS)[number] {
  return OWN_BRAND_DEBUG_ONLY_TAB_IDS.includes(tabId as (typeof OWN_BRAND_DEBUG_ONLY_TAB_IDS)[number]);
}

/** Own-brand Ad Library sub-tabs hidden until `NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION=true`. */
export const OWN_BRAND_DEBUG_ONLY_SUB_TABS: readonly {
  parentTabId: CompetitorPageTabId;
  subTabId: CompetitorSubTabId;
}[] = [{ parentTabId: "ads library", subTabId: "saved" }];

export function isOwnBrandDebugOnlySubTab(parentTabId: string, subTabId: string): boolean {
  return OWN_BRAND_DEBUG_ONLY_SUB_TABS.some(
    (entry) => entry.parentTabId === parentTabId && entry.subTabId === subTabId,
  );
}

export function competitorSubTabsForView(opts: {
  parentTab: CompetitorPageTab;
  isOwnWorkspace: boolean;
  showDebugTabs?: boolean;
}): CompetitorSubTab[] {
  const { parentTab, isOwnWorkspace, showDebugTabs = false } = opts;
  const subTabs = parentTab.subTabs ?? [];
  if (!isOwnWorkspace || showDebugTabs) return subTabs;

  const hidden = new Set(
    OWN_BRAND_DEBUG_ONLY_SUB_TABS.filter((entry) => entry.parentTabId === parentTab.id).map(
      (entry) => entry.subTabId,
    ),
  );
  return subTabs.filter((st) => !hidden.has(st.id));
}

export function competitorPageTabsForView(opts: {
  isOwnWorkspace: boolean;
  showDebugTabs?: boolean;
}): CompetitorPageTab[] {
  const { isOwnWorkspace, showDebugTabs = false } = opts;

  let base = isOwnWorkspace
    ? COMPETITOR_PAGE_TABS.filter((t) => t.id !== "comparison")
    : [...COMPETITOR_PAGE_TABS];

  if (isOwnWorkspace && !showDebugTabs) {
    const hidden = new Set<string>(OWN_BRAND_DEBUG_ONLY_TAB_IDS);
    base = base.filter((t) => !hidden.has(t.id));
  }

  if (!isOwnWorkspace) return base;

  const adsIdx = base.findIndex((t) => t.id === "ads library");
  const inserts: CompetitorPageTab[] = [WORKSPACE_ADS_TAB, WORKSPACE_BENCHMARK_TAB];
  if (showDebugTabs) inserts.push(WORKSPACE_MARKETING_IMPROVEMENTS_TAB);

  const next = [...base];
  next.splice(adsIdx >= 0 ? adsIdx + 1 : 0, 0, ...inserts);
  return next;
}
