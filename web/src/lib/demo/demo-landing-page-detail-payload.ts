import type { PageDetailStaticPayload } from "@/components/website-tracker/PageDetailDrawer";
import type { TrackedPageRow } from "@/components/website-tracker/types";
import {
  FROZEN_PAGE_DETAILS,
  FROZEN_TRACKED_PAGES,
  FROZEN_WEBSITE_COMPETITOR_NAME,
} from "@/lib/demo/frozen/frozen-neptunas-website";

export type DemoPageDetailPayload = PageDetailStaticPayload;

export const DEMO_PAGE_DETAIL_COMPETITOR_ID = "demo-frozen-neptunas";
export const DEMO_PAGE_DETAIL_COMPETITOR_NAME = FROZEN_WEBSITE_COMPETITOR_NAME;

function pageUrl(hostPath: string): string {
  const trimmed = hostPath.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function buildDemoPageDetailPayload(pageId: string): DemoPageDetailPayload | null {
  return FROZEN_PAGE_DETAILS[pageId] ?? null;
}

export function demoTrackedPageHref(pageId: string): string | null {
  return buildDemoPageDetailPayload(pageId)?.page.url ?? null;
}

export function listDemoTrackedPageIds(): string[] {
  return FROZEN_TRACKED_PAGES.map((p) => p.id);
}

export function demoTrackedPageSeed(pageId: string): TrackedPageRow | null {
  const card = FROZEN_TRACKED_PAGES.find((p) => p.id === pageId);
  const detail = buildDemoPageDetailPayload(pageId);
  if (!card || !detail) return null;
  return {
    ...detail.page,
    label: card.label,
    url: pageUrl(card.url),
  };
}
