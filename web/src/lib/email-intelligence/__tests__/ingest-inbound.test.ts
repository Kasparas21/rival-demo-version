import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  inboundMatchesTrackingAddress,
  ingestCompetitorInboundEmail,
} from "@/lib/email-intelligence/ingest-inbound";

const analyzeMock = vi.fn();
const adminFromMock = vi.fn();

vi.mock("@/lib/email-intelligence/analyze", () => ({
  analyzeCompetitorEmail: (...args: unknown[]) => analyzeMock(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: (...args: unknown[]) => adminFromMock(...args),
  }),
}));

const tracker = {
  id: "tracker-1",
  user_id: "user-1",
  competitor_id: "comp-1",
};

function buildExistingQuery(existing: { id: string; ai_processed_at?: string | null } | null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: existing, error: null }),
  };
}

function buildInsertQuery(id: string) {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id }, error: null }),
  };
}

describe("inboundMatchesTrackingAddress", () => {
  it("matches plain and angle-bracket addresses", () => {
    expect(
      inboundMatchesTrackingAddress(["rival-abc@test.resend.app"], "rival-abc@test.resend.app"),
    ).toBe(true);
    expect(
      inboundMatchesTrackingAddress(
        ['Rival <rival-abc@test.resend.app>'],
        "rival-abc@test.resend.app",
      ),
    ).toBe(true);
    expect(inboundMatchesTrackingAddress(["other@test.resend.app"], "rival-abc@test.resend.app")).toBe(
      false,
    );
  });
});

describe("ingestCompetitorInboundEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dedupes by resend inbound id", async () => {
    adminFromMock.mockReturnValue(buildExistingQuery({ id: "existing-1" }));

    const result = await ingestCompetitorInboundEmail({
      tracker,
      receivedEmail: { subject: "Hi", from: "a@b.com", html: "<p>x</p>" } as never,
      resendInboundId: "inb_dup",
      runAnalysis: false,
    });

    expect(result).toEqual({ ok: true, id: "existing-1", created: false });
    expect(analyzeMock).not.toHaveBeenCalled();
  });

  it("defaults runAnalysis to false on new inserts", async () => {
    adminFromMock
      .mockReturnValueOnce(buildExistingQuery(null))
      .mockReturnValueOnce(buildInsertQuery("new-1"));

    const result = await ingestCompetitorInboundEmail({
      tracker,
      receivedEmail: { subject: "Hi", from: "a@b.com", html: "<p>x</p>" } as never,
      resendInboundId: "inb_new",
    });

    expect(result).toEqual({ ok: true, id: "new-1", created: true });
    expect(analyzeMock).not.toHaveBeenCalled();
  });

  it("runs analysis for existing pending email when runAnalysis is true", async () => {
    adminFromMock
      .mockReturnValueOnce(buildExistingQuery({ id: "existing-2" }))
      .mockReturnValueOnce(buildExistingQuery({ id: "existing-2", ai_processed_at: null }));

    await ingestCompetitorInboundEmail({
      tracker,
      receivedEmail: { subject: "Hi", from: "a@b.com", html: "<p>x</p>" } as never,
      resendInboundId: "inb_analyze",
      runAnalysis: true,
    });

    expect(analyzeMock).toHaveBeenCalledWith("existing-2");
  });
});
