import { describe, expect, it } from "vitest";

import {
  detectNonMarketingEmail,
  isNonMarketingEmailRow,
  isSkippedTransactionalAnalysis,
  SKIPPED_TRANSACTIONAL_ANALYSIS_VERSION,
} from "../detect-non-marketing-email";

describe("detectNonMarketingEmail", () => {
  it("detects one-time verification codes from subject", () => {
    const result = detectNonMarketingEmail({
      subject: "Here's your one-time code",
      preview_text: null,
      body: "",
    });
    expect(result?.kind).toBe("verification_code");
    expect(result?.label).toBe("Verification email");
  });

  it("detects profile verification codes from body", () => {
    const result = detectNonMarketingEmail({
      subject: "Nike Member",
      preview_text: null,
      body: "Your Nike Member profile code is 70643617. This code expires after 15 minutes.",
    });
    expect(result?.kind).toBe("verification_code");
  });

  it("detects password reset emails", () => {
    const result = detectNonMarketingEmail({
      subject: "Reset your password",
      preview_text: "Use this link to reset your password",
      body: "",
    });
    expect(result?.kind).toBe("password_reset");
    expect(result?.label).toBe("Password reset email");
  });

  it("returns null for promotional emails", () => {
    const result = detectNonMarketingEmail({
      subject: "Flash sale — 20% off ends tonight",
      preview_text: "Shop bestsellers before midnight",
      body: "Our biggest sale of the season starts now.",
    });
    expect(result).toBeNull();
  });
});

describe("isSkippedTransactionalAnalysis", () => {
  it("matches skipped transactional analysis version", () => {
    expect(
      isSkippedTransactionalAnalysis({ ai_analysis_version: SKIPPED_TRANSACTIONAL_ANALYSIS_VERSION }),
    ).toBe(true);
    expect(isSkippedTransactionalAnalysis({ ai_analysis_version: "v2" })).toBe(false);
  });
});

describe("isNonMarketingEmailRow", () => {
  it("uses stored skipped version", () => {
    expect(
      isNonMarketingEmailRow({
        ai_analysis_version: SKIPPED_TRANSACTIONAL_ANALYSIS_VERSION,
        subject: "Promo",
      }),
    ).toBe(true);
  });

  it("detects verification emails from subject when not yet processed", () => {
    expect(
      isNonMarketingEmailRow({
        subject: "Here's your one-time code",
      }),
    ).toBe(true);
  });
});
