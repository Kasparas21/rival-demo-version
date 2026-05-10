import {
  BarChart3,
  GitCompareArrows,
  Library,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type CompetitorPageTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** When true, tab shows locked / coming-soon state */
  disabled?: boolean;
};

export const COMPETITOR_PAGE_TABS: CompetitorPageTab[] = [
  { id: "ads library", label: "Ads Library", icon: Library },
  { id: "strategy overview", label: "Strategy Overview", icon: BarChart3 },
  { id: "comparison", label: "Comparison to Your Brand", icon: GitCompareArrows },
  { id: "AI insight", label: "AI Insight", icon: Sparkles },
];

/** Shown only on the signed-in user’s own brand hub — ad source URLs / handles (not competitor spy). */
export const WORKSPACE_ADS_TAB: CompetitorPageTab = {
  id: "workspace ads",
  label: "Workspace ads",
  icon: SlidersHorizontal,
};

/** Cross-competitor coaching for the workspace brand (uses cached Ads Library creative from rivals you follow). */
export const WORKSPACE_MARKETING_IMPROVEMENTS_TAB: CompetitorPageTab = {
  id: "marketing improvements",
  label: "Improve marketing",
  icon: TrendingUp,
};
