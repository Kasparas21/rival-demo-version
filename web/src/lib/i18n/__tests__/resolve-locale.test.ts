import { describe, expect, it } from "vitest";

import { resolveLocale } from "@/lib/i18n/resolve-locale";

describe("resolveLocale", () => {
  it("prefers ?lang= over cookie and country", () => {
    expect(resolveLocale({ langParam: "de", cookie: "nl", country: "GB" })).toBe("de");
  });

  it("uses cookie when no lang param", () => {
    expect(resolveLocale({ cookie: "nl", country: "DE" })).toBe("nl");
  });

  it("maps country when no overrides", () => {
    expect(resolveLocale({ country: "DE" })).toBe("de");
    expect(resolveLocale({ country: "NL" })).toBe("nl");
    expect(resolveLocale({ country: "GB" })).toBe("en");
  });

  it("falls back to en", () => {
    expect(resolveLocale({})).toBe("en");
  });
});
