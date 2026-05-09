import type { ChannelId } from "@/components/channel-picker-modal";
import { linkedInAdLibraryUrlHasAdvertiserTargeting } from "@/lib/linkedin-ad-library-url";

export type ValidateIdentifierResult =
  | { valid: true }
  | { valid: false; error: string }
  | { valid: false; warning: string };

/**
 * Inline validation rules for competitor identifier fields on blur / submit.
 * Meta blocks non–Ad Library Facebook URLs; LinkedIn warns on keyword-style URLs.
 */
export function validateIdentifierField(fieldId: ChannelId, value: string): ValidateIdentifierResult {
  const v = value.trim();
  if (!v) return { valid: true };

  const low = v.toLowerCase();

  switch (fieldId) {
    case "meta": {
      if (
        low.includes("facebook.com") ||
        low.includes("fb.com") ||
        low.includes("fb.me")
      ) {
        if (!low.includes("ads/library")) {
          return {
            valid: false,
            error:
              "Please enter the Ad Library URL, not the Facebook page. Find it at facebook.com/ads/library",
          };
        }
      }
      const digitsOnly = value.replace(/\D/g, "");
      const looksBarePageId =
        /^[\d\s-]+$/.test(value.trim()) &&
        digitsOnly.length >= 10 &&
        digitsOnly.length <= 22;
      if (looksBarePageId) return { valid: true };

      if (!low.includes("facebook.com") && !low.includes("fb.com") && !low.includes("fb.me")) {
        return {
          valid: false,
          error:
            "Please enter the Ad Library URL, not the Facebook page. Find it at facebook.com/ads/library",
        };
      }

      return { valid: true };
    }
    case "linkedin": {
      if (low.includes("linkedin.com") && !linkedInAdLibraryUrlHasAdvertiserTargeting(v)) {
        return {
          valid: false,
          warning: "This looks like a keyword search — results may include other companies",
        };
      }
      return { valid: true };
    }
    case "google":
    case "tiktok":
    case "pinterest":
    case "snapchat":
      return { valid: true };
  }
}
