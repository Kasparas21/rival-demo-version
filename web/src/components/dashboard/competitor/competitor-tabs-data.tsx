import {
  BarChart3,
  Beaker,
  Bell,
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
  | "strategy-insight"
  | "moves"
  | "creative-tests"
  | "timeline"
  | "landing-pages"
  | "audience"
  | "hooks"
  | "copy-vault"
  | "briefs";

export type CompetitorPageTabId =
  | "ads library"
  | "insights"
  | "tests"
  | "audience-copy"
  | "comparison"
  | "alerts"
  | "workspace-ads"
  | "workspace-marketing-improvements";

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
      { id: "strategy-insight", label: "Strategy Insight" },
      { id: "moves", label: "Strategic Moves", isNew: true },
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
      { id: "audience", label: "Audience", isNew: true },
      { id: "hooks", label: "Hooks", isNew: true, isStub: true },
      { id: "copy-vault", label: "Copy Vault" },
      { id: "briefs", label: "Briefs", isNew: true, isStub: true },
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
