/** Dispatched on the window after a successful `/api/ads/library` response so Strategy Overview can refresh. */
export const ADS_LIBRARY_UPDATED_EVENT = "rival:ads-library-updated";

/** Organic scrape or email inbox sync landed — refresh the strategy map channel layer. */
export const STRATEGY_CHANNEL_DATA_UPDATED_EVENT = "rival:strategy-channel-data-updated";

export type AdsLibraryUpdatedDetail = {
  domain: string;
};

export type StrategyChannelDataUpdatedDetail = {
  domain: string;
};

export function dispatchStrategyChannelDataUpdated(domain: string): void {
  if (typeof window === "undefined") return;
  const d = domain.trim().toLowerCase();
  if (!d) return;
  markPendingStrategyRefresh(d);
  window.dispatchEvent(
    new CustomEvent<StrategyChannelDataUpdatedDetail>(STRATEGY_CHANNEL_DATA_UPDATED_EVENT, {
      detail: { domain: d },
    }),
  );
}

const PENDING_KEY_PREFIX = "rival:pending-strategy-refresh:";

export function pendingStrategyRefreshStorageKey(domainNorm: string): string {
  return `${PENDING_KEY_PREFIX}${domainNorm.trim().toLowerCase()}`;
}

/** After a successful ads library save, Strategy Overview can read this on mount if navigation skipped the window event. */
export function markPendingStrategyRefresh(domain: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(pendingStrategyRefreshStorageKey(domain), String(Date.now()));
  } catch {
    /* ignore */
  }
}
