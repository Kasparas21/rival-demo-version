import { BarChart3, GitCompareArrows, Library, Sparkles, type LucideIcon } from "lucide-react";

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
