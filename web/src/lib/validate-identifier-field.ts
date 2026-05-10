import type { ChannelId } from "@/components/channel-picker-modal";
import { canonicalGoogleAdsTransparencyStartUrl } from "@/lib/ad-library/google-transparency-url";
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
    case "google": {
      if (canonicalGoogleAdsTransparencyStartUrl(v)) return { valid: true };
      return {
        valid: false,
        error:
          "That link doesn’t include a Transparency advertiser ID (…/advertiser/AR…). Open Google Ads Transparency Center, search for the brand, then open any creative or ad — copy the URL from that page’s address bar and paste it here. Don’t use only a shop domain or a ?domain= search results page.",
      };
    }
    case "tiktok":
    case "pinterest":
    case "snapchat":
      return { valid: true };
  }
}
