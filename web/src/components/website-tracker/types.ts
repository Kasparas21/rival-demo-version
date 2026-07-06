import type { Json } from "@/lib/supabase/types";

export type TrackedPageSnapshot = {
  id: string;
  screenshot_url: string;
  hero_screenshot_url: string | null;
  page_text: Json;
  pixel_diff_pct: number | null;
  has_meaningful_change: boolean;
  change_analysis: Json;
  taken_at: string;
  status?: string;
};

export type TrackedPageRow = {
  id: string;
  url: string;
  label: string;
  page_type: string;
  is_active: boolean;
  auto_detected_from: string | null;
  last_screenshotted_at: string | null;
  next_screenshot_at: string | null;
  latestSnapshot: TrackedPageSnapshot | null;
};

export type LandingPageChangeRow = TrackedPageSnapshot & {
  landing_pages: {
    id: string;
    label: string;
    url: string;
    page_type: string;
  } | null;
};

export type ChangeAnalysis = {
  what_changed?: string;
  strategic_interpretation?: string;
  what_to_do?: string;
  urgency?: string;
  threat_score?: number;
  sections_changed?: string[];
  change_confidence?: "noise" | "suspected_ab" | "confirmed";
};

export function changeConfidence(
  raw: Json | null | undefined,
): "noise" | "suspected_ab" | "confirmed" | null {
  const analysis = parseChangeAnalysis(raw);
  return analysis.change_confidence ?? null;
}

export function parseChangeAnalysis(raw: Json | null | undefined): ChangeAnalysis {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as ChangeAnalysis;
}

export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return `${Math.floor(s / (86400 * 7))}w ago`;
}

export function fmtUntil(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, Math.floor((t - Date.now()) / 1000));
  if (s <= 0) return "soon";
  if (s < 3600) return `in ${Math.max(1, Math.floor(s / 60))}m`;
  if (s < 86400) return `in ${Math.floor(s / 3600)}h`;
  return `in ${Math.floor(s / 86400)}d`;
}

export type PageStatus = "pending" | "unchanged" | "changed" | "ab_suspected";

export function pageStatus(page: TrackedPageRow): PageStatus {
  if (!page.last_screenshotted_at || !page.latestSnapshot) return "pending";
  const confidence = changeConfidence(page.latestSnapshot.change_analysis);
  if (page.latestSnapshot.has_meaningful_change && confidence === "suspected_ab") {
    return "ab_suspected";
  }
  if (page.latestSnapshot.has_meaningful_change) return "changed";
  return "unchanged";
}

export function snapshotPreviewUrl(
  snapshot: TrackedPageSnapshot | null | undefined,
): string | null {
  if (!snapshot) return null;
  return snapshot.hero_screenshot_url ?? snapshot.screenshot_url ?? null;
}
