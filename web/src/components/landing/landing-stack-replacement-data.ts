import type { LucideIcon } from "lucide-react";
import { FileSpreadsheet, FolderOpen, Layers, Play, Search, UserSearch } from "lucide-react";

export type StackTool = {
  name: string;
  icon: LucideIcon;
  iconClass: string;
  iconBg: string;
};

export const WITHOUT_RIVAL_STACK: StackTool[] = [
  { name: "AdLibrary.com", icon: Search, iconClass: "text-[#2563eb]", iconBg: "bg-[#dbeafe]" },
  { name: "SpyFu / Semrush", icon: UserSearch, iconClass: "text-[#1a1a1a]", iconBg: "bg-[#f3f4f6]" },
  { name: "PiPiAds", icon: Play, iconClass: "text-[#7c3aed]", iconBg: "bg-[#ede9fe]" },
  { name: "Foreplay", icon: Layers, iconClass: "text-[#1a1a1a]", iconBg: "bg-[#f3f4f6]" },
  { name: "5 native ad libraries", icon: FolderOpen, iconClass: "text-[#ca8a04]", iconBg: "bg-[#fef9c3]" },
  { name: "Spreadsheets & decks", icon: FileSpreadsheet, iconClass: "text-[#16a34a]", iconBg: "bg-[#dcfce7]" },
];

export const WITHOUT_RIVAL_PAIN_POINTS = [
  "Cross-platform funnels — built manually in spreadsheets",
  "Per-competitor timelines — one tool at a time",
  "Weekly test ideas — guesswork, not scrape data",
  "6 logins, 6 invoices, zero shared context",
  "No strategy map — just a pile of ads",
  "Monday mornings lost to tab-switching",
] as const;

/** Shorter pain points for mobile stack card. */
export const WITHOUT_RIVAL_PAIN_POINTS_MOBILE = [
  "Funnels built in spreadsheets",
  "Timelines — one tool at a time",
  "Test ideas from guesswork",
  "6 logins, zero shared context",
  "No strategy map — just ads",
] as const;

export const WITHOUT_RIVAL_INTRO_MOBILE =
  "6 tools, 6 logins — stitched together by hand every week.";

export const WITH_RIVAL_FEATURES = [
  "Add a competitor by domain — all 6 platforms",
  "Auto-refresh + timelines built in",
  "Funnel + landing-page archive",
  "AI angles + weekly Three Moves email",
  "Think in rivals, not networks",
  "Stealable Angles vs your own ad library",
  "Monday Activity Feed + digest email",
  "One login — no per-platform upcharges",
] as const;

/** Fewer, shorter bullets for mobile stack card. */
export const WITH_RIVAL_FEATURES_MOBILE = [
  "Add competitor by domain — all 6 platforms",
  "Auto-refresh + timelines built in",
  "Funnel + landing-page archive",
  "AI angles + weekly Three Moves",
  "One login — no per-platform fees",
] as const;

export const WITH_RIVAL_PLATFORMS = [
  "Meta",
  "Google",
  "TikTok",
  "LinkedIn",
  "Snapchat",
  "Reddit",
] as const;
