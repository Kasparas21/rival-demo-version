import {
  BarChart3,
  Bell,
  Globe,
  GitCompareArrows,
  Library,
  Mail,
  Share2,
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
  | "copy-vault"
  | "feed"
  | "insights"
  | "organic-settings"
  | "paid-media-settings"
  | "tracked"
  | "from-ads"
  | "inbox"
  | "benchmark"
  | "improve-marketing";

export type CompetitorPageTabId =
  | "ads library"
  | "insights"
  | "comparison"
  | "alerts"
  | "email-marketing"
  | "organic"
  | "website"
  | "workspace-ads"
  | "workspace-marketing-improvements"
  | "benchmark";

export type CompetitorSubTab = {
  id: CompetitorSubTabId;
  label: string;
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
    label: "Paid Media",
    icon: Library,
    defaultSubTab: "all",
    subTabs: [
      { id: "all", label: "Ad Library" },
      { id: "saved", label: "Saved" },
      { id: "creative-tests", label: "Creative Tests" },
      { id: "timeline", label: "Timeline" },
      { id: "audience", label: "Audience" },
      { id: "copy-vault", label: "Copy Vault" },
      { id: "paid-media-settings", label: "Settings" },
    ],
  },
  {
    id: "organic",
    label: "Organic",
    icon: Share2,
    defaultSubTab: "feed",
    subTabs: [
      { id: "feed", label: "Feed" },
      { id: "insights", label: "Insights" },
      { id: "organic-settings", label: "Settings" },
    ],
  },
  {
    id: "website",
    label: "Website",
    icon: Globe,
    defaultSubTab: "tracked",
    subTabs: [
      { id: "tracked", label: "Tracked pages" },
      { id: "from-ads", label: "From ads" },
    ],
  },
  {
    id: "email-marketing",
    label: "Email Marketing",
    icon: Mail,
    defaultSubTab: "inbox",
    subTabs: [
      { id: "inbox", label: "Inbox" },
      { id: "saved", label: "Saved" },
      { id: "insights", label: "Insights" },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    icon: BarChart3,
    defaultSubTab: "strategy-map",
    subTabs: [
      { id: "strategy-map", label: "Strategy Map" },
      { id: "activity-feed", label: "Activity Feed" },
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

/** Insights sub-tabs hidden on the signed-in user's own brand hub. */
export const OWN_BRAND_HIDDEN_INSIGHTS_SUB_TABS: readonly CompetitorSubTabId[] = ["activity-feed"];

/** Extra Insights sub-tabs shown only on the signed-in user's own brand hub. */
export const OWN_BRAND_INSIGHTS_EXTRA_SUB_TABS: readonly CompetitorSubTab[] = [
  { id: "benchmark", label: "Benchmark" },
];

/** Own-brand Insights sub-tabs hidden until `NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION=true`. */
export const OWN_BRAND_DEBUG_ONLY_INSIGHTS_EXTRA_SUB_TABS: readonly CompetitorSubTab[] = [
  { id: "improve-marketing", label: "Improve Marketing" },
];

export function ownBrandInsightsDefaultSubTab(showDebugTabs: boolean): CompetitorSubTabId {
  return showDebugTabs ? "strategy-map" : "benchmark";
}

export function findCompetitorTab(id: string): CompetitorPageTab | undefined {
  return COMPETITOR_PAGE_TABS.find((t) => t.id === id);
}

export function findCompetitorSubTab(parentId: string, subId: string): CompetitorSubTab | undefined {
  const parent = findCompetitorTab(parentId);
  const base = parent?.subTabs?.find((st) => st.id === subId);
  if (base) return base;
  if (parentId === "insights") {
    return (
      OWN_BRAND_INSIGHTS_EXTRA_SUB_TABS.find((st) => st.id === subId) ??
      OWN_BRAND_DEBUG_ONLY_INSIGHTS_EXTRA_SUB_TABS.find((st) => st.id === subId)
    );
  }
  return undefined;
}

/** Competitor hub tabs hidden until `NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION=true`. */
export const DEBUG_ONLY_TAB_IDS: readonly CompetitorPageTabId[] = [];

export function isGlobalDebugOnlyTab(tabId: string): tabId is (typeof DEBUG_ONLY_TAB_IDS)[number] {
  return DEBUG_ONLY_TAB_IDS.includes(tabId as (typeof DEBUG_ONLY_TAB_IDS)[number]);
}

/** Own-brand hub tabs hidden until `NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION=true`. */
export const OWN_BRAND_DEBUG_ONLY_TAB_IDS: readonly CompetitorPageTabId[] = [];

export function isOwnBrandDebugOnlyTab(tabId: string): tabId is (typeof OWN_BRAND_DEBUG_ONLY_TAB_IDS)[number] {
  return OWN_BRAND_DEBUG_ONLY_TAB_IDS.includes(tabId as (typeof OWN_BRAND_DEBUG_ONLY_TAB_IDS)[number]);
}

/** Own-brand sub-tabs hidden until `NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION=true`. */
export const OWN_BRAND_DEBUG_ONLY_SUB_TABS: readonly {
  parentTabId: CompetitorPageTabId;
  subTabId: CompetitorSubTabId;
}[] = [
  { parentTabId: "ads library", subTabId: "saved" },
  { parentTabId: "ads library", subTabId: "creative-tests" },
  { parentTabId: "ads library", subTabId: "timeline" },
  { parentTabId: "ads library", subTabId: "audience" },
  { parentTabId: "ads library", subTabId: "copy-vault" },
  { parentTabId: "insights", subTabId: "strategy-map" },
  { parentTabId: "insights", subTabId: "improve-marketing" },
];

export function isOwnBrandDebugOnlySubTab(parentTabId: string, subTabId: string): boolean {
  return OWN_BRAND_DEBUG_ONLY_SUB_TABS.some(
    (entry) => entry.parentTabId === parentTabId && entry.subTabId === subTabId,
  );
}

/** @deprecated Legacy top-level tab ids — redirected to new locations on own-brand hub. */
export const LEGACY_OWN_BRAND_TAB_IDS: readonly CompetitorPageTabId[] = [
  "workspace-ads",
  "workspace-marketing-improvements",
  "benchmark",
];

export function isLegacyOwnBrandTabId(tabId: string): tabId is (typeof LEGACY_OWN_BRAND_TAB_IDS)[number] {
  return LEGACY_OWN_BRAND_TAB_IDS.includes(tabId as (typeof LEGACY_OWN_BRAND_TAB_IDS)[number]);
}

export function competitorSubTabsForView(opts: {
  parentTab: CompetitorPageTab;
  isOwnWorkspace: boolean;
  showDebugTabs?: boolean;
}): CompetitorSubTab[] {
  const { parentTab, isOwnWorkspace, showDebugTabs = false } = opts;
  let visible = [...(parentTab.subTabs ?? [])];

  if (isOwnWorkspace && parentTab.id === "insights") {
    visible = [...visible, ...OWN_BRAND_INSIGHTS_EXTRA_SUB_TABS];
    if (showDebugTabs) {
      visible = [...visible, ...OWN_BRAND_DEBUG_ONLY_INSIGHTS_EXTRA_SUB_TABS];
    }
    const hiddenInsights = new Set<string>(OWN_BRAND_HIDDEN_INSIGHTS_SUB_TABS);
    if (!showDebugTabs) {
      hiddenInsights.add("strategy-map");
    }
    visible = visible.filter((st) => !hiddenInsights.has(st.id));
  }

  if (isOwnWorkspace && !showDebugTabs) {
    const hidden = new Set(
      OWN_BRAND_DEBUG_ONLY_SUB_TABS.filter((entry) => entry.parentTabId === parentTab.id).map(
        (entry) => entry.subTabId,
      ),
    );
    visible = visible.filter((st) => !hidden.has(st.id));
  }

  return visible;
}

export function competitorPageTabsForView(opts: {
  isOwnWorkspace: boolean;
  showDebugTabs?: boolean;
}): CompetitorPageTab[] {
  const { isOwnWorkspace, showDebugTabs = false } = opts;

  let base = isOwnWorkspace
    ? COMPETITOR_PAGE_TABS.filter((t) => t.id !== "comparison" && t.id !== "alerts")
    : [...COMPETITOR_PAGE_TABS];

  if (!showDebugTabs) {
    const hidden = new Set<string>(DEBUG_ONLY_TAB_IDS);
    if (isOwnWorkspace) {
      OWN_BRAND_DEBUG_ONLY_TAB_IDS.forEach((id) => hidden.add(id));
    }
    base = base.filter((t) => !hidden.has(t.id));
  }

  return base;
}

export function resolveSubTabFromParams(
  params: { get: (key: string) => string | null },
  tab: string,
  viewOpts: { isOwnWorkspace: boolean; showDebugTabs?: boolean },
): CompetitorSubTabId | null {
  const def = findCompetitorTab(tab);
  if (!def) return null;
  const subTabs = competitorSubTabsForView({ parentTab: def, ...viewOpts });
  if (subTabs.length === 0) return null;

  let sub = (params.get("sub") ?? "").trim();
  if (tab === "ads library" && sub === "settings") sub = "paid-media-settings";
  if (sub && subTabs.some((s) => s.id === sub)) return sub as CompetitorSubTabId;
  if (tab === "insights" && viewOpts.isOwnWorkspace) {
    return ownBrandInsightsDefaultSubTab(viewOpts.showDebugTabs ?? false);
  }
  return (def.defaultSubTab ?? subTabs[0]?.id ?? null) as CompetitorSubTabId | null;
}
