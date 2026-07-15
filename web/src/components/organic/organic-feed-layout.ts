import type { OrganicPlatform } from "@/lib/organic-content/types";

export {
  platformRefreshActionsRowClass,
  platformRefreshOnlyButtonClass,
  platformSectionPanelClass,
} from "@/components/dashboard/competitor/competitor-platform-styles";

/** Same breakpoints as Ads Library inline grids. */
export const ORGANIC_POSTS_GRID_CLASS =
  "grid grid-cols-1 items-start gap-4 sm:grid-cols-2 md:grid-cols-3";

export const organicPostsBodyShellClass =
  "border-t border-[#DDF1FD]/35 bg-[linear-gradient(180deg,rgba(248,250,252,0.88)_0%,rgba(255,255,255,0.35)_100%)] px-4 pb-5 pt-5 sm:px-5";

/** Feed section order — Facebook first, then typical social priority. */
export const ORGANIC_FEED_PLATFORM_ORDER: OrganicPlatform[] = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "linkedin",
  "twitter",
];

export const ORGANIC_PLATFORM_FILTER_CONFIG: {
  id: OrganicPlatform;
  label: string;
}[] = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "twitter", label: "X" },
];
