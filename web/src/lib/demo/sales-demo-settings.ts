export type SalesDemoSettings = {
  /** Hide ads that lack a dashboard image or video preview. */
  onlyWithPreviews: boolean;
  /** Hide entire platform sections when nothing passes the filters above. */
  hideEmptyPlatforms: boolean;
  /** Only show ads that are currently active / running. */
  activeAdsOnly: boolean;
};

export const DEFAULT_SALES_DEMO_SETTINGS: SalesDemoSettings = {
  onlyWithPreviews: true,
  hideEmptyPlatforms: true,
  activeAdsOnly: false,
};

const STORAGE_KEY = "rival:sales-demo-settings";
export const SALES_DEMO_SETTINGS_CHANGED_EVENT = "rival:sales-demo-settings-changed";

const DEMO_SETTINGS_COMPETITOR_DOMAINS = new Set(["adidas.com"]);

export function isDemoSettingsCompetitor(domain: string): boolean {
  return DEMO_SETTINGS_COMPETITOR_DOMAINS.has(domain.trim().toLowerCase());
}

function normalizeSettings(raw: unknown): SalesDemoSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SALES_DEMO_SETTINGS };
  const o = raw as Record<string, unknown>;
  return {
    onlyWithPreviews:
      typeof o.onlyWithPreviews === "boolean"
        ? o.onlyWithPreviews
        : DEFAULT_SALES_DEMO_SETTINGS.onlyWithPreviews,
    hideEmptyPlatforms:
      typeof o.hideEmptyPlatforms === "boolean"
        ? o.hideEmptyPlatforms
        : DEFAULT_SALES_DEMO_SETTINGS.hideEmptyPlatforms,
    activeAdsOnly:
      typeof o.activeAdsOnly === "boolean" ? o.activeAdsOnly : DEFAULT_SALES_DEMO_SETTINGS.activeAdsOnly,
  };
}

export function readSalesDemoSettings(): SalesDemoSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SALES_DEMO_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SALES_DEMO_SETTINGS };
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SALES_DEMO_SETTINGS };
  }
}

export function writeSalesDemoSettings(next: SalesDemoSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(SALES_DEMO_SETTINGS_CHANGED_EVENT, { detail: next }));
  } catch {
    /* ignore quota */
  }
}

export function patchSalesDemoSettings(patch: Partial<SalesDemoSettings>): SalesDemoSettings {
  const merged = { ...readSalesDemoSettings(), ...patch };
  writeSalesDemoSettings(merged);
  return merged;
}
