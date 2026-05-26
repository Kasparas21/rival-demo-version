import { describe, expect, it } from "vitest";

import { buildPolarCheckoutBrowserMetadata } from "@/lib/analytics/polar-checkout-metadata";

function mockRequest(options: {
  cookies?: Record<string, string>;
  url?: string;
  referer?: string | null;
  forwardedFor?: string | null;
  userAgent?: string | null;
  realIp?: string | null;
}): Parameters<typeof buildPolarCheckoutBrowserMetadata>[0] {
  const url = new URL(options.url ?? "https://www.spy-rival.com/api/billing/checkout?plan=pro");
  const cookieStore = {
    get: (name: string) => {
      const value = options.cookies?.[name];
      return value != null ? { name, value } : undefined;
    },
  };

  return {
    nextUrl: url,
    cookies: cookieStore,
    headers: {
      get: (name: string) => {
        const lower = name.toLowerCase();
        if (lower === "referer") return options.referer ?? null;
        if (lower === "x-forwarded-for") return options.forwardedFor ?? null;
        if (lower === "x-real-ip") return options.realIp ?? null;
        if (lower === "user-agent") return options.userAgent ?? null;
        return null;
      },
    },
  } as Parameters<typeof buildPolarCheckoutBrowserMetadata>[0];
}

describe("buildPolarCheckoutBrowserMetadata", () => {
  it("reads cookies and headers", () => {
    const meta = buildPolarCheckoutBrowserMetadata(
      mockRequest({
        cookies: { _fbp: "fb.1.123.456", _fbc: "fb.1.789.abc" },
        forwardedFor: "203.0.113.10, 10.0.0.1",
        userAgent: "Mozilla/5.0 Test",
      }),
    );

    expect(meta).toEqual({
      fbp: "fb.1.123.456",
      fbc: "fb.1.789.abc",
      client_ip: "203.0.113.10",
      user_agent: "Mozilla/5.0 Test",
    });
  });

  it("builds fbc from fbclid on request URL when cookie missing", () => {
    const meta = buildPolarCheckoutBrowserMetadata(
      mockRequest({
        url: "https://www.spy-rival.com/api/billing/checkout?plan=pro&fbclid=click123",
      }),
    );

    expect(meta.fbp).toBe("");
    expect(meta.fbc).toMatch(/^fb\.1\.\d+\.click123$/);
  });

  it("builds fbc from fbclid on referer when cookie missing", () => {
    const meta = buildPolarCheckoutBrowserMetadata(
      mockRequest({
        referer: "https://www.facebook.com/?fbclid=ref456",
      }),
    );

    expect(meta.fbc).toMatch(/^fb\.1\.\d+\.ref456$/);
  });

  it("falls back to x-real-ip then empty strings", () => {
    expect(
      buildPolarCheckoutBrowserMetadata(mockRequest({ realIp: "198.51.100.2" })).client_ip,
    ).toBe("198.51.100.2");
    expect(buildPolarCheckoutBrowserMetadata(mockRequest({})).client_ip).toBe("");
    expect(buildPolarCheckoutBrowserMetadata(mockRequest({})).user_agent).toBe("");
  });
});
