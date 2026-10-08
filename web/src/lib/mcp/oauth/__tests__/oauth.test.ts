import { afterEach, describe, expect, it, vi } from "vitest";

import { verifyPkceS256 } from "@/lib/mcp/oauth/pkce";
import {
  createMcpAccessToken,
  verifyMcpAccessToken,
  hashOpaqueToken,
} from "@/lib/mcp/oauth/tokens";
import { isMcpOAuthEnabled } from "@/lib/mcp/oauth-enabled";
import { createHmac } from "node:crypto";

describe("mcp oauth pkce", () => {
  it("verifies S256 challenge", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
    expect(verifyPkceS256(verifier, challenge)).toBe(true);
    expect(verifyPkceS256("wrong", challenge)).toBe(false);
  });
});

describe("mcp oauth access tokens", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips a valid access token", () => {
    vi.stubEnv("MCP_OAUTH_SIGNING_SECRET", "a".repeat(32));
    const token = createMcpAccessToken({ userId: "user-1", clientId: "mcp_client" });
    const payload = verifyMcpAccessToken(token);
    expect(payload?.user_id).toBe("user-1");
    expect(payload?.client_id).toBe("mcp_client");
    expect(payload?.scope).toBe("mcp:read");
  });

  it("doesn't accept a token signed for another purpose with the same key", () => {
    // Production signs Slack OAuth state with the same fallback secret; a payload shaped like an access
    // token, signed the way the state is, must not verify.
    const key = "s".repeat(32);
    vi.stubEnv("MCP_OAUTH_SIGNING_SECRET", "");
    vi.stubEnv("INTEGRATIONS_OAUTH_STATE_SECRET", key);
    const encoded = Buffer.from(
      JSON.stringify({ v: "mcp1", user_id: "user-1", client_id: "x", scope: "mcp:read", exp: Math.floor(Date.now() / 1000) + 600 }),
    ).toString("base64url");
    const forged = `${encoded}.${createHmac("sha256", key).update(encoded).digest("base64url")}`;
    expect(verifyMcpAccessToken(forged)).toBeNull();
    expect(verifyMcpAccessToken(createMcpAccessToken({ userId: "user-1", clientId: "x" }))?.user_id).toBe("user-1");
  });

  it("rejects tampered tokens", () => {
    vi.stubEnv("MCP_OAUTH_SIGNING_SECRET", "a".repeat(32));
    const token = createMcpAccessToken({ userId: "user-1", clientId: "mcp_client" });
    expect(verifyMcpAccessToken(`${token}x`)).toBeNull();
  });

  it("hashes opaque tokens deterministically", () => {
    vi.stubEnv("MCP_OAUTH_SIGNING_SECRET", "b".repeat(32));
    expect(hashOpaqueToken("abc")).toBe(hashOpaqueToken("abc"));
  });
});

describe("mcp oauth enabled flag", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is false by default", () => {
    vi.stubEnv("MCP_OAUTH_ENABLED", "");
    expect(isMcpOAuthEnabled()).toBe(false);
  });

  it("is true when set", () => {
    vi.stubEnv("MCP_OAUTH_ENABLED", "true");
    expect(isMcpOAuthEnabled()).toBe(true);
  });
});
