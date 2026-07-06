import { describe, expect, it } from "vitest";

import {
  buildAutopilotEnabledEmailHtml,
  buildAutopilotEnabledEmailText,
} from "@/lib/autopilot/send-autopilot-enabled-email";

describe("autopilot enabled confirmation email", () => {
  const base = {
    settingsUrl: "https://spy-rival.com/dashboard/settings?autopilot=open",
    unsubscribeUrl: "https://spy-rival.com/api/autopilot/unsubscribe?token=abc",
    channelLine: "email and Slack",
    scheduleLabel: "Daily at 07:15 UTC",
  };

  it("includes key copy in html", () => {
    const html = buildAutopilotEnabledEmailHtml(base);
    expect(html).toContain("Autopilot is on");
    expect(html).toContain("email and Slack");
    expect(html).toContain("Daily at 07:15 UTC");
  });

  it("includes key copy in text", () => {
    const text = buildAutopilotEnabledEmailText(base);
    expect(text).toContain("Autopilot is on");
    expect(text).toContain(base.settingsUrl);
  });
});
