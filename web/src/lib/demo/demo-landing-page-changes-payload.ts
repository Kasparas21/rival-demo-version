import { buildDemoPageDetailPayload, listDemoTrackedPageIds } from "@/lib/demo/demo-landing-page-detail-payload";
import { FROZEN_LANDING_PAGE_CHANGES } from "@/lib/demo/frozen/frozen-neptunas-website";
import type { LandingPageChangeRow } from "@/components/website-tracker/types";

/** Demo change rows for Latest changes — pairs latest meaningful snapshot with its prior capture. */
export type DemoLandingPageChangeRow = LandingPageChangeRow & {
  prev_screenshot_url?: string | null;
  prev_hero_screenshot_url?: string | null;
  prev_page_text?: unknown;
  prev_taken_at?: string | null;
};

export function buildDemoLandingPageChangeRows(): DemoLandingPageChangeRow[] {
  return FROZEN_LANDING_PAGE_CHANGES;
}

export function demoTrackedPageIdForUrl(url: string): string | null {
  const normalized = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const match = listDemoTrackedPageIds().find((id) => {
    const detail = buildDemoPageDetailPayload(id);
    if (!detail) return false;
    return detail.page.url.replace(/^https?:\/\//, "").replace(/\/$/, "") === normalized;
  });
  return match ?? null;
}
