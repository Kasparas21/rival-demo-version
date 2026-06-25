import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const updateMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: () => ({
      update: updateMock.mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "tracker-1",
          tracking_address: "rival@test.resend.app",
          tracking_code: "abc",
          is_active: false,
        },
        error: null,
      }),
    }),
  })),
}));

const competitorId = "11111111-1111-4111-8111-111111111111";

describe("POST /api/email-trackers/[competitor_id]/deactivate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  it("deactivates tracker", async () => {
    const { POST } = await import("@/app/api/email-trackers/[competitor_id]/deactivate/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ competitor_id: competitorId }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.tracker.is_active).toBe(false);
    expect(updateMock).toHaveBeenCalledWith({ is_active: false });
  });
});
