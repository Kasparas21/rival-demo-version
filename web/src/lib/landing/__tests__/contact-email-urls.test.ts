import { describe, expect, it } from "vitest";

import { buildContactEmailUrl, parseMailtoHref } from "@/lib/landing/contact-email-urls";

describe("parseMailtoHref", () => {
  it("parses email and subject from mailto links", () => {
    expect(parseMailtoHref("mailto:hello@spy-rival.com?subject=Enterprise%20pricing")).toEqual({
      email: "hello@spy-rival.com",
      subject: "Enterprise pricing",
    });
  });

  it("parses email-only mailto links", () => {
    expect(parseMailtoHref("mailto:hello@spy-rival.com")).toEqual({
      email: "hello@spy-rival.com",
      subject: undefined,
    });
  });
});

describe("buildContactEmailUrl", () => {
  const email = "hello@spy-rival.com";
  const subject = "Enterprise pricing";

  it("builds Gmail compose URLs", () => {
    expect(buildContactEmailUrl("gmail", email, subject)).toBe(
      "https://mail.google.com/mail/?view=cm&fs=1&to=hello%40spy-rival.com&su=Enterprise%20pricing",
    );
  });

  it("builds Apple Mail mailto links", () => {
    expect(buildContactEmailUrl("apple", email, subject)).toBe(
      "mailto:hello@spy-rival.com?subject=Enterprise%20pricing",
    );
  });

  it("builds Outlook web compose URLs", () => {
    expect(buildContactEmailUrl("outlook", email, subject)).toBe(
      "https://outlook.live.com/mail/0/deeplink/compose?to=hello%40spy-rival.com&subject=Enterprise%20pricing",
    );
  });
});
