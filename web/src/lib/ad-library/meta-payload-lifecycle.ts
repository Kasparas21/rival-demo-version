import { hydrateMetaAdCardForLibrary } from "@/lib/ad-library/count-active-ads";
import type { MetaAdCard } from "@/lib/ad-library/normalize";

function readFiniteNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;
}

function readBooleanish(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (v === 1 || v === "1" || v === "true") return true;
  if (v === 0 || v === "0" || v === "false") return false;
  return undefined;
}

/**
 * Normalize stored Meta `raw_payload` before lifecycle checks.
 * Recovers `endedAt` / `isActive` when older normalizers dropped them, then
 * applies scrape-aware active rules.
 */
export function metaCardForLifecycle(rawPayload: unknown, scrapeAtMs?: number): MetaAdCard | null {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return null;
  const p = rawPayload as Record<string, unknown>;
  const card = { ...(p as MetaAdCard) };

  if (card.endedAt == null) {
    card.endedAt =
      readFiniteNumber(p.end_date) ??
      readFiniteNumber(p.endDate) ??
      readFiniteNumber(p.ended_at);
  }

  if (card.isActive == null) {
    card.isActive =
      readBooleanish(p.is_active) ??
      readBooleanish(p.isActive);
  }

  return hydrateMetaAdCardForLibrary(card, scrapeAtMs);
}
