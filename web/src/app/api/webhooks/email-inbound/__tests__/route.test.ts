import { beforeEach, describe, expect, it, vi } from "vitest";

const ingestMock = vi.fn();
const parseTrackingMock = vi.fn();
const receivingGetMock = vi.fn();
const verifyMock = vi.fn();
const adminFromMock = vi.fn();
const afterMock = vi.fn((fn: () => Promise<void>) => {
  void fn();
});

vi.mock("@/lib/email-intelligence/ingest-inbound", () => ({
  ingestCompetitorInboundEmail: (...args: unknown[]) => ingestMock(...args),
}));

vi.mock("@/lib/email-intelligence/tracking-code", () => ({
  parseTrackingCodeFromAddress: (...args: unknown[]) => parseTrackingMock(...args),
}));

vi.mock("@/lib/email-intelligence/analyze", () => ({
  analyzeCompetitorEmail: vi.fn(),
}));

vi.mock("@/lib/email/resend-config", () => ({
  getResendApiKey: () => "re_test",
  getResendWebhookSecret: () => "whsec_test",
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: (...args: unknown[]) => adminFromMock(...args),
  }),
}));

vi.mock("resend", () => ({
  Resend: class {
    webhooks = { verify: (...args: unknown[]) => verifyMock(...args) };
    emails = {
      receiving: {
        get: (...args: unknown[]) => receivingGetMock(...args),
      },
    };
  },
}));

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    after: (fn: () => Promise<void>) => afterMock(fn),
  };
});

function buildTrackerQuery(result: { id: string; user_id: string; competitor_id: string } | null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: result, error: null }),
  };
}

describe("POST /api/webhooks/email-inbound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyMock.mockReturnValue({
      type: "email.received",
      data: {
        to: ["rival-abc@test.resend.app"],
        email_id: "inb_123",
        created_at: "2026-06-01T12:00:00.000Z",
      },
    });
    parseTrackingMock.mockReturnValue("abc");
    adminFromMock.mockReturnValue(
      buildTrackerQuery({
        id: "tracker-1",
        user_id: "user-1",
        competitor_id: "comp-1",
      }),
    );
  });

  it("returns 502 when receiving.get fails", async () => {
    receivingGetMock.mockResolvedValue({ data: null, error: { message: "not found" } });
    const { POST } = await import("@/app/api/webhooks/email-inbound/route");
    const res = await POST(
      new Request("http://localhost/api/webhooks/email-inbound", {
        method: "POST",
        body: "{}",
        headers: {
          "svix-id": "id",
          "svix-timestamp": "1",
          "svix-signature": "sig",
        },
      }),
    );
    expect(res.status).toBe(502);
  });

  it("returns 500 when ingest fails", async () => {
    receivingGetMock.mockResolvedValue({
      data: { subject: "Hi", from: "a@b.com", html: "<p>x</p>" },
      error: null,
    });
    ingestMock.mockResolvedValue({ ok: false, error: "insert failed" });
    const { POST } = await import("@/app/api/webhooks/email-inbound/route");
    const res = await POST(
      new Request("http://localhost/api/webhooks/email-inbound", {
        method: "POST",
        body: "{}",
        headers: {
          "svix-id": "id",
          "svix-timestamp": "1",
          "svix-signature": "sig",
        },
      }),
    );
    expect(res.status).toBe(500);
  });

  it("returns 200 when ingest succeeds", async () => {
    receivingGetMock.mockResolvedValue({
      data: { subject: "Hi", from: "a@b.com", html: "<p>x</p>" },
      error: null,
    });
    ingestMock.mockResolvedValue({ ok: true, id: "email-1", created: true });
    const { POST } = await import("@/app/api/webhooks/email-inbound/route");
    const res = await POST(
      new Request("http://localhost/api/webhooks/email-inbound", {
        method: "POST",
        body: "{}",
        headers: {
          "svix-id": "id",
          "svix-timestamp": "1",
          "svix-signature": "sig",
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(ingestMock).toHaveBeenCalledWith(
      expect.objectContaining({ runAnalysis: false }),
    );
  });
});
