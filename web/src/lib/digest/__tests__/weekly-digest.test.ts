import { describe, expect, it } from "vitest";

import { formatDigestChangeLine } from "@/lib/digest/format-digest-change";
import {
  buildWeeklyDigestEmailHtml,
  WEEKLY_DIGEST_BRAND_ACCENT,
  WEEKLY_DIGEST_EMAIL_SAMPLE,
} from "@/lib/digest/weekly-digest-email";
import {
  createWeeklyDigestUnsubscribeToken,
  verifyWeeklyDigestUnsubscribeToken,
} from "@/lib/digest/unsubscribe-token";

describe("formatDigestChangeLine", () => {
  it("formats activity spike with numbers", () => {
    const line = formatDigestChangeLine({
      alert_type: "activity_spike",
      title: "Spike",
      body: null,
      metadata: { scoreBefore: 41, scoreAfter: 78, scoreDelta: 37 },
    });
    expect(line).toContain("41");
    expect(line).toContain("78");
  });
});

describe("weekly digest unsubscribe token", () => {
  it("round-trips user id", () => {
    process.env.CRON_SECRET = "test-secret-for-digest";
    const token = createWeeklyDigestUnsubscribeToken("11111111-1111-4111-8111-111111111111");
    expect(verifyWeeklyDigestUnsubscribeToken(token)).toBe("11111111-1111-4111-8111-111111111111");
  });
});

describe("weekly digest email html", () => {
  it("renders table layout under 100KB", () => {
    const html = buildWeeklyDigestEmailHtml(WEEKLY_DIGEST_EMAIL_SAMPLE);
    expect(html).toContain("<table");
    expect(html).not.toContain("backdrop-filter");
    expect(html).not.toContain("display:flex");
    expect(html).toContain("Competitors active");
    expect(html).toContain("Where they advertise");
    expect(html).toContain("Activity score");
    expect(html).toContain('bgcolor="#0A0A0A"');
    expect(html).toContain(WEEKLY_DIGEST_BRAND_ACCENT);
    expect(Buffer.byteLength(html, "utf8")).toBeLessThan(100_000);
  });
});
