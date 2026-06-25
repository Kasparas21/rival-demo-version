import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const trackerMaybeSingleMock = vi.fn();
const competitorMaybeSingleMock = vi.fn();
const updateMock = vi.fn();

vi.mock("@/lib/email-intelligence/tracking-code", () => ({
  buildTrackingCode: () => "new-code",
  buildTrackingAddress: (code: string) => `rival-${code}@test.resend.app`,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => {
      if (table === "competitor_email_trackers") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: trackerMaybeSingleMock,
          update: updateMock.mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: "tracker-1",
              tracking_address: "rival-new-code@test.resend.app",
              tracking_code: "new-code",
              is_active: true,
            },
            error: null,
          }),
        };
      }
      if (table === "saved_competitors") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: competitorMaybeSingleMock,
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  })),
}));

const competitorId = "11111111-1111-4111-8111-111111111111";

describe("POST /api/email-trackers/[competitor_id]/regenerate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    trackerMaybeSingleMock.mockResolvedValue({
      data: { id: "tracker-1", competitor_id: competitorId },
      error: null,
    });
    competitorMaybeSingleMock.mockResolvedValue({
      data: { slug: "adidas" },
      error: null,
    });
  });

  it("regenerates tracking address and reactivates tracker", async () => {
    const { POST } = await import("@/app/api/email-trackers/[competitor_id]/regenerate/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ competitor_id: competitorId }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.tracker.tracking_code).toBe("new-code");
    expect(json.tracker.is_active).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tracking_code: "new-code",
        is_active: true,
      }),
    );
  });
});
