import { describe, expect, it } from "vitest";

import { readAdminAdsScrapeMode } from "@/lib/billing/entitlements";

function mergeAdminAdsScrapeMode(
  payload: Record<string, unknown>,
  mode: "auto" | "manual",
): Record<string, unknown> {
  return { ...payload, admin_ads_scrape_mode: mode };
}

describe("readAdminAdsScrapeMode", () => {
  it("defaults to manual when absent, so admin, comped and tester accounts don't spend credits on their own", () => {
    expect(readAdminAdsScrapeMode(null)).toBe("manual");
    expect(readAdminAdsScrapeMode({})).toBe("manual");
    expect(readAdminAdsScrapeMode({ admin_ads_scrape_mode: "weekly" })).toBe("manual");
    expect(readAdminAdsScrapeMode({ admin_unlimited: true })).toBe("manual");
  });

  it("defaults to auto for paying Polar subscribers", () => {
    expect(readAdminAdsScrapeMode({}, { payingSubscriber: true })).toBe("auto");
  });

  it("an explicit admin choice always wins", () => {
    expect(readAdminAdsScrapeMode({ admin_ads_scrape_mode: "manual" }, { payingSubscriber: true })).toBe("manual");
    expect(readAdminAdsScrapeMode({ admin_ads_scrape_mode: "auto" }, { payingSubscriber: false })).toBe("auto");
  });

  it("reads manual mode", () => {
    expect(readAdminAdsScrapeMode({ admin_ads_scrape_mode: "manual" })).toBe("manual");
  });

  it("reads explicit auto mode", () => {
    expect(readAdminAdsScrapeMode({ admin_ads_scrape_mode: "auto" })).toBe("auto");
  });
});

describe("admin ads scrape mode payload merge", () => {
  it("sets admin_ads_scrape_mode on raw_payload", () => {
    const payload = { admin_plan_override: "pro", admin_unlimited: true };
    expect(mergeAdminAdsScrapeMode(payload, "manual")).toEqual({
      admin_plan_override: "pro",
      admin_unlimited: true,
      admin_ads_scrape_mode: "manual",
    });
  });

  it("overwrites an existing mode", () => {
    const payload = { admin_ads_scrape_mode: "manual" };
    expect(mergeAdminAdsScrapeMode(payload, "auto")).toEqual({
      admin_ads_scrape_mode: "auto",
    });
  });
});
