import { describe, expect, it } from "vitest";

import { detectEspFromHtml } from "../esp-detect";

describe("detectEspFromHtml", () => {
  it("detects Klaviyo links", () => {
    expect(detectEspFromHtml('<a href="https://trk.klaviyo.com/click">')).toBe("Klaviyo");
  });

  it("detects Mailchimp links", () => {
    expect(detectEspFromHtml("https://us21.list-manage.com/track")).toBe("Mailchimp");
  });

  it("returns Unknown for empty html", () => {
    expect(detectEspFromHtml(null)).toBe("Unknown");
    expect(detectEspFromHtml("")).toBe("Unknown");
  });
});
