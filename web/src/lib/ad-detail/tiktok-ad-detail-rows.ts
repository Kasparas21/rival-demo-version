/** TikTok-only tail rows (`firstShown`, impressions, Region → Detail tab canonically). */

import { mergeTikTokStructuredTargeting } from "@/lib/ad-library/normalize";

export type TikTokDetailRow = { label: string; value: string };

export function buildTikTokAdLibraryDetailRows(rawPayload: unknown): TikTokDetailRow[] {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return [];
  const p = rawPayload as Record<string, unknown>;
  const structured = mergeTikTokStructuredTargeting(p);

  const push = (label: string, v: unknown): TikTokDetailRow[] => {
    if (typeof v !== "string" || !v.trim()) return [];
    return [{ label, value: v.trim() }];
  };

  const age = structured.targetAge || p.targetAge;
  const gender = structured.targetGender || p.targetGender;

  return [...push("Age", age), ...push("Gender", gender)];
}
