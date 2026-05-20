import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { authLinkOriginForRequest } from "@/lib/auth/auth-link-origin";
import { isLocalDevHostname } from "@/lib/auth/local-dev";

describe("isLocalDevHostname", () => {
  it("recognizes local hosts", () => {
    expect(isLocalDevHostname("localhost")).toBe(true);
    expect(isLocalDevHostname("127.0.0.1")).toBe(true);
    expect(isLocalDevHostname("spy-rival.com")).toBe(false);
  });
});

describe("authLinkOriginForRequest", () => {
  it("uses localhost origin when the request is local even if NEXT_PUBLIC_APP_URL is production", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://spy-rival.com");
    const req = new NextRequest("http://localhost:3000/api/auth/sign-up-email", {
      headers: { host: "localhost:3000" },
    });
    expect(authLinkOriginForRequest(req)).toBe("http://localhost:3000");
  });

  it("uses configured app URL for production requests", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://spy-rival.com");
    const req = new NextRequest("https://spy-rival.com/api/auth/sign-up-email", {
      headers: { host: "spy-rival.com", "x-forwarded-proto": "https" },
    });
    expect(authLinkOriginForRequest(req)).toBe("https://spy-rival.com");
  });
});
