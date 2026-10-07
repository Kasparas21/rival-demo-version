import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const incr = vi.fn();
const expire = vi.fn();
vi.mock("@upstash/redis", () => ({
  Redis: class {
    incr = incr;
    expire = expire;
  },
}));

async function load() {
  vi.resetModules();
  return import("@/lib/rate-limit");
}

beforeEach(() => {
  incr.mockReset();
  expire.mockReset();
  for (const k of ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"]) {
    vi.stubEnv(k, "");
  }
});
afterEach(() => vi.unstubAllEnvs());

describe("redisRestCredentials", () => {
  it("reads Vercel KV's variable names (what production has)", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://kv.example");
    vi.stubEnv("KV_REST_API_TOKEN", "t");
    const { redisRestCredentials } = await load();
    expect(redisRestCredentials()).toEqual({ url: "https://kv.example", token: "t" });
  });

  it("returns null with no credentials", async () => {
    const { redisRestCredentials } = await load();
    expect(redisRestCredentials()).toBeNull();
  });
});

describe("hitRateLimit", () => {
  it("blocks once a window is full (in-memory fallback)", async () => {
    const { hitRateLimit } = await load();
    const windows = [{ windowSec: 60, max: 3 }];
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await hitRateLimit("test:ip:1.2.3.4", windows));
    expect(results).toEqual([true, true, true, false, false]);
    expect(await hitRateLimit("test:ip:5.6.7.8", windows)).toBe(true);
  });

  it("uses Redis when configured and sets the expiry on the first hit", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://kv.example");
    vi.stubEnv("KV_REST_API_TOKEN", "t");
    incr.mockResolvedValueOnce(1).mockResolvedValueOnce(4);
    const { hitRateLimit } = await load();
    expect(await hitRateLimit("k", [{ windowSec: 60, max: 3 }])).toBe(true);
    expect(expire).toHaveBeenCalledWith("rl:k:60", 60);
    expect(await hitRateLimit("k", [{ windowSec: 60, max: 3 }])).toBe(false);
  });

  it("fails open when Redis errors, so sign-in never locks up", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://kv.example");
    vi.stubEnv("KV_REST_API_TOKEN", "t");
    incr.mockRejectedValue(new Error("down"));
    const { hitRateLimit } = await load();
    expect(await hitRateLimit("k", [{ windowSec: 60, max: 1 }])).toBe(true);
  });
});

describe("clientIp", () => {
  it("takes the first forwarded hop", async () => {
    const { clientIp } = await load();
    expect(clientIp(new Request("https://x", { headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1" } }))).toBe("9.9.9.9");
    expect(clientIp(new Request("https://x"))).toBe("unknown");
  });
});
