/** Shared horizontal padding for competitor dashboard — edge-to-edge within the main column. */
export const COMPETITOR_PAGE_X = "px-4 sm:px-5";

/** Standard tab content shell (full width of main column). */
export const COMPETITOR_PAGE_SHELL = "w-full px-4 py-6 sm:px-5";

/** Reset dashboard main column scroll (competitor tabs use page-level scroll on `<main>`). */
export function scrollDashboardMainToTop(): void {
  if (typeof document === "undefined") return;
  document.querySelector("main")?.scrollTo({ top: 0, left: 0, behavior: "auto" });
}
