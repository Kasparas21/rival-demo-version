/** Matches top filter bar + ad cards — header + inline scrape controls */
export const platformSectionPanelClass =
  "mb-6 overflow-hidden rounded-2xl border border-white/60 bg-white/50 backdrop-blur-md shadow-[0_4px_24px_rgba(31,38,135,0.05)]";
export const platformSelectClass =
  "h-9 min-w-[9.5rem] max-w-[min(100%,20rem)] rounded-xl border border-white/70 bg-white/95 px-3 pr-9 text-[13px] font-medium text-[#343434] shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus:outline-none focus:ring-2 focus:ring-[#DDF1FD] focus:border-[#93c5fd] cursor-pointer";
export const platformScrapeToggleBarClass =
  "border-t border-[#DDF1FD]/30 bg-[linear-gradient(180deg,rgba(248,250,252,0.9)_0%,rgba(255,255,255,0.35)_100%)]";
export const platformScrapeActionsRowClass = `flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5 ${platformScrapeToggleBarClass}`;
/** Refresh-only actions row (no per-platform scrape settings toggle). */
export const platformRefreshActionsRowClass = `flex justify-end px-3 py-2 sm:px-5 ${platformScrapeToggleBarClass}`;
export const platformScrapeToggleTextButtonClass =
  "min-w-0 flex-1 rounded-lg px-2 py-2 text-left text-[13px] font-medium text-[#475569] transition-colors hover:bg-white/50";
export const platformRefreshOnlyButtonClass =
  "inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-[13px] font-medium text-[#4b5563] transition-colors hover:border-[#DDF1FD] hover:bg-white disabled:pointer-events-none disabled:opacity-50 sm:w-auto";
export const platformScrapeInputClass =
  "h-9 w-full min-w-0 rounded-xl border border-white/70 bg-white/95 px-2.5 text-[13px] text-[#343434] shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus:outline-none focus:ring-2 focus:ring-[#DDF1FD] sm:max-w-[11rem]";
export const platformScrapeFieldsGridClass =
  "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
