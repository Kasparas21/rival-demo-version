import { BarChart3, GitCompareArrows, Library, Sparkles } from "lucide-react";

export const COMPETITOR_PAGE_TABS = [
  { id: "ads library", label: "Ads Library", icon: Library },
  { id: "strategy overview", label: "Strategy Overview", icon: BarChart3 },
  { id: "comparison", label: "Comparison to Your Brand", icon: GitCompareArrows, disabled: true },
  { id: "AI insight", label: "AI Insight", icon: Sparkles, disabled: true },
] as const;
