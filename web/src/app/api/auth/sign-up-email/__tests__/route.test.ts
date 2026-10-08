import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const generateLinkMock = vi.fn();
const sendMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ auth: { admin: { generateLink: generateLinkMock } } }),
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));
vi.mock("@/lib/email/resend-config", () => ({
  getResendApiKey: () => "re_test",
  getResendFromEmail: () => "Rival <hello@example.test>",
}));
vi.mock("@/lib/rate-limit", () => ({
  clientIp: () => "127.0.0.1",
  hitRateLimit: async () => true,
  PUBLIC_EMAIL_LIMITS: { perIp: [], perEmail: [] },
}));
vi.mock("@/lib/analytics/posthog-server", () => ({ getPostHogServerClient: () => null }));

import { POST } from "@/app/api/auth/sign-up-email/route";

const signUp = (email: string) =>
  POST(
    new NextRequest("http://localhost:3000/api/auth/sign-up-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: "correct-horse-battery", locale: "en" }),
    }),
  );

describe("POST /api/auth/sign-up-email", () => {
  beforeEach(() => {
    generateLinkMock.mockReset();
    sendMock.mockReset().mockResolvedValue({ data: { id: "email_1" }, error: null });
  });

  it("answers an existing address exactly like a new one, and emails the owner a sign-in link", async () => {
    generateLinkMock.mockResolvedValue({
      data: { user: null, properties: null },
      error: { code: "email_exists", message: "A user with this email address has already been registered" },
    });
    const taken = await signUp("taken@example.test");

    generateLinkMock.mockResolvedValue({
      data: { user: { id: "u1" }, properties: { hashed_token: "abc" } },
      error: null,
    });
    const fresh = await signUp("new@example.test");

    expect(taken.status).toBe(fresh.status);
    expect(await taken.json()).toEqual(await fresh.json());
    const takenMail = sendMock.mock.calls[0]![0] as { subject: string; text: string };
    expect(takenMail.subject).toBe("You already have a Rival account");
    expect(takenMail.text).toContain("http://localhost:3000/login");
    expect(takenMail.text).not.toContain("{loginUrl}");
  });

  it("doesn't pass Supabase's error text through to the client", async () => {
    generateLinkMock.mockResolvedValue({ data: null, error: { code: "unexpected", message: "internal details" } });
    const res = await signUp("someone@example.test");
    expect(res.status).toBe(400);
    expect(JSON.stringify(await res.json())).not.toContain("internal details");
  });
});
