import { beforeEach, describe, expect, it, vi } from "vitest";

const ingestMock = vi.fn();
const analyzePendingMock = vi.fn();
const receivingListMock = vi.fn();
const receivingGetMock = vi.fn();

vi.mock("@/lib/email-intelligence/ingest-inbound", () => ({
  inboundMatchesTrackingAddress: (to: string[] | undefined, address: string) =>
    to?.some((addr) => addr.toLowerCase().includes(address.toLowerCase())) ?? false,
  ingestCompetitorInboundEmail: (...args: unknown[]) => ingestMock(...args),
}));

vi.mock("@/lib/email-intelligence/analyze-pending", () => ({
  analyzePendingCompetitorEmails: (...args: unknown[]) => analyzePendingMock(...args),
}));

vi.mock("@/lib/email/resend-config", () => ({
  getResendApiKey: () => "re_test",
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "tracker-1",
          user_id: "user-1",
          competitor_id: "comp-1",
          tracking_address: "rival-abc@test.resend.app",
          is_active: true,
        },
        error: null,
      }),
    }),
  }),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      receiving: {
        list: (...args: unknown[]) => receivingListMock(...args),
        get: (...args: unknown[]) => receivingGetMock(...args),
      },
    };
  },
}));

describe("syncCompetitorEmailsFromResend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    receivingListMock.mockResolvedValue({
      data: {
        data: [{ id: "inb_1", to: ["rival-abc@test.resend.app"], created_at: "2026-06-01T12:00:00.000Z" }],
      },
      error: null,
    });
    receivingGetMock.mockResolvedValue({
      data: { subject: "Sale", from: "shop@brand.com", html: "<p>sale</p>" },
      error: null,
    });
    ingestMock.mockResolvedValue({ ok: true, id: "email-1", created: true });
    analyzePendingMock.mockResolvedValue(undefined);
  });

  it("ingests without inline analyze and batches analyze after sync", async () => {
    const { syncCompetitorEmailsFromResend } = await import(
      "@/lib/email-intelligence/sync-from-resend"
    );

    const result = await syncCompetitorEmailsFromResend({
      trackerId: "tracker-1",
      trackingAddress: "rival-abc@test.resend.app",
    });

    expect(result.synced).toBe(1);
    expect(ingestMock).toHaveBeenCalledWith(
      expect.objectContaining({ runAnalysis: false, resendInboundId: "inb_1" }),
    );
    expect(analyzePendingMock).toHaveBeenCalledWith({
      competitorId: "comp-1",
      userId: "user-1",
      limit: expect.any(Number),
    });
  });
});
