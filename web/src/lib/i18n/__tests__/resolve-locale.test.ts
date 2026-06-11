import { describe, expect, it } from "vitest";

import { resolveLocale } from "@/lib/i18n/resolve-locale";

describe("resolveLocale", () => {
  it("prefers ?lang= over geo and saved choice", () => {
    expect(
      resolveLocale({ langParam: "de", cookie: "nl", userPickedLocale: true, country: "GB" }),
    ).toBe("de");
  });

  it("uses geo when country is known, even if a stale locale cookie exists", () => {
    expect(resolveLocale({ cookie: "de", country: "GB" })).toBe("en");
    expect(resolveLocale({ cookie: "nl", country: "DE" })).toBe("de");
  });

  it("maps DE and NL from geo; everything else to en", () => {
    expect(resolveLocale({ country: "DE" })).toBe("de");
    expect(resolveLocale({ country: "NL" })).toBe("nl");
    expect(resolveLocale({ country: "GB" })).toBe("en");
    expect(resolveLocale({ country: "LT" })).toBe("en");
    expect(resolveLocale({ country: "AT" })).toBe("en");
  });

  it("falls back to en when geo is missing", () => {
    expect(resolveLocale({})).toBe("en");
    expect(resolveLocale({ country: "" })).toBe("en");
  });

  it("honors a user-picked locale when geo is unavailable", () => {
    expect(resolveLocale({ cookie: "de", userPickedLocale: true })).toBe("de");
    expect(resolveLocale({ cookie: "nl", userPickedLocale: true, country: null })).toBe("nl");
  });
});
