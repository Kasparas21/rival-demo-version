import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { authorizeCron } from "@/lib/cron/authorize-cron";

describe("authorizeCron", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env, CRON_SECRET: "test-cron-secret" };
  });

  afterEach(() => {
    process.env = env;
  });

  it("accepts Bearer authorization header", () => {
    const req = new Request("https://example.com/api/cron/weekly-scrape", {
      headers: { authorization: "Bearer test-cron-secret" },
    });
    expect(authorizeCron(req)).toBe(true);
  });

  it("accepts secret query param", () => {
    const req = new Request("https://example.com/api/cron/weekly-scrape?secret=test-cron-secret");
    expect(authorizeCron(req)).toBe(true);
  });

  it("rejects wrong secret", () => {
    const req = new Request("https://example.com/api/cron/weekly-scrape", {
      headers: { authorization: "Bearer wrong" },
    });
    expect(authorizeCron(req)).toBe(false);
  });

  it("rejects when CRON_SECRET is unset", () => {
    delete process.env.CRON_SECRET;
    const req = new Request("https://example.com/api/cron/weekly-scrape", {
      headers: { authorization: "Bearer test-cron-secret" },
    });
    expect(authorizeCron(req)).toBe(false);
  });

  it("trims whitespace from CRON_SECRET", () => {
    process.env.CRON_SECRET = "  test-cron-secret  ";
    const req = new Request("https://example.com/api/cron/weekly-scrape", {
      headers: { authorization: "Bearer test-cron-secret" },
    });
    expect(authorizeCron(req)).toBe(true);
  });
});

describe("cron route exports", () => {
  it("weekly-scrape exports GET and POST", async () => {
    const mod = await import("@/app/api/cron/weekly-scrape/route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
  });

  it("enrich-pending exports GET and POST", async () => {
    const mod = await import("@/app/api/cron/enrich-pending/route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
  });

  it("send-alert-emails exports GET and POST", async () => {
    const mod = await import("@/app/api/cron/send-alert-emails/route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
  });

  it("archive-killed-ads exports GET and POST", async () => {
    const mod = await import("@/app/api/cron/archive-killed-ads/route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
  });

  it("weekly-digest exports GET and POST", async () => {
    const mod = await import("@/app/api/cron/weekly-digest/route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
  });
});
