import type { SupportedPlatform } from "@/lib/spend-estimator/types";

/**
 * Best-effort: true when raw_payload (normalized card JSON) carries any library-reported
 * reach / impression hint we might use in a future calibration pass.
 */
export function hasImpressionBandInPayload(raw: unknown, platform: SupportedPlatform): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;

  switch (platform) {
    case "meta":
      return typeof o.impressionsIndex === "number" && Number.isFinite(o.impressionsIndex);
    case "tiktok":
      return typeof o.uniqueUsersSeen === "string" && o.uniqueUsersSeen.trim().length > 0;
    case "pinterest":
      return typeof o.reachSummary === "string" && o.reachSummary.trim().length > 0;
    case "snapchat":
      return typeof o.impressionsLabel === "string" && o.impressionsLabel.trim().length > 0;
    case "google":
    case "linkedin":
    default:
      return false;
  }
}
