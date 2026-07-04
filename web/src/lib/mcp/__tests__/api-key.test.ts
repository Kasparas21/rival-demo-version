import { describe, expect, it } from "vitest";

import {
  generateMcpApiKeyPlaintext,
  hashMcpApiKey,
  isValidMcpApiKeyFormat,
  MCP_API_KEY_PATTERN,
} from "@/lib/mcp/api-key";
import { McpToolError } from "@/lib/mcp/errors";
import { rejectNonBearerScheme } from "@/lib/mcp/authenticate";

describe("mcp api key", () => {
  it("generates keys matching the required pattern", () => {
    const key = generateMcpApiKeyPlaintext();
    expect(MCP_API_KEY_PATTERN.test(key)).toBe(true);
    expect(isValidMcpApiKeyFormat(key)).toBe(true);
  });

  it("rejects invalid key formats before lookup", () => {
    expect(isValidMcpApiKeyFormat("rvl_short")).toBe(false);
    expect(isValidMcpApiKeyFormat("Bearer rvl_x")).toBe(false);
    expect(isValidMcpApiKeyFormat(null)).toBe(false);
  });

  it("hashes deterministically", () => {
    const key = generateMcpApiKeyPlaintext();
    expect(hashMcpApiKey(key)).toBe(hashMcpApiKey(key));
  });
});

describe("mcp http auth scheme", () => {
  it("rejects non-Bearer schemes", () => {
    expect(rejectNonBearerScheme("Basic abc")).toBe(true);
    expect(rejectNonBearerScheme("Bearer rvl_test")).toBe(false);
    expect(rejectNonBearerScheme(null)).toBe(false);
  });
});

describe("mcp tool errors", () => {
  it("serializes consistent error shape", () => {
    const err = new McpToolError("plan_gated", "upgrade needed", "/checkout");
    expect(err.toBody()).toEqual({
      ok: false,
      code: "plan_gated",
      message: "upgrade needed",
      dashboard_url: "/checkout",
    });
  });
});
