import { beforeEach, describe, expect, it, vi } from "vitest";

const countMock = vi.fn();
const pageMock = vi.fn();
const insightsMock = vi.fn();
const buildInsightsMock = vi.fn();
const getUserMock = vi.fn();
const trackerMaybeSingleMock = vi.fn();

vi.mock("@/lib/email-intelligence/api-queries", () => ({
  countCompetitorEmails: (...args: unknown[]) => countMock(...args),
  fetchCompetitorEmailPage: (...args: unknown[]) => pageMock(...args),
  fetchCompetitorEmailsForInsights: (...args: unknown[]) => insightsMock(...args),
  buildInsightsResponse: (...args: unknown[]) => buildInsightsMock(...args),
  fetchCompetitorEmailById: vi.fn(),
  EMAIL_INSIGHTS_MIN_COUNT: 5,
}));

vi.mock("@/lib/email-intelligence/sync-from-resend", () => ({
  syncCompetitorEmailsFromResend: vi.fn(),
}));

vi.mock("@/lib/email-intelligence/analyze-pending", () => ({
  analyzePendingCompetitorEmails: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: () => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: trackerMaybeSingleMock,
    }),
  })),
}));

const competitorId = "11111111-1111-4111-8111-111111111111";

describe("GET /api/email-trackers/[competitor_id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    trackerMaybeSingleMock.mockResolvedValue({
      data: { id: "tracker-1", tracking_address: "rival@test.resend.app", is_active: true },
      error: null,
    });
    countMock.mockResolvedValue(3);
    pageMock.mockResolvedValue({ emails: [], nextCursor: null });
    insightsMock.mockResolvedValue({ rows: [], truncated: false });
    buildInsightsMock.mockReturnValue({
      insights: null,
      insightsLocked: true,
      emailCount: 3,
      unlockAt: 5,
    });
  });

  it("returns count-only payload", async () => {
    const { GET } = await import("@/app/api/email-trackers/[competitor_id]/route");
    const res = await GET(
      new Request(`http://localhost/api/email-trackers/${competitorId}?count=1`),
      { params: Promise.resolve({ competitor_id: competitorId }) },
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.emailCount).toBe(3);
    expect(json.insightsUnlocked).toBe(false);
    expect(pageMock).not.toHaveBeenCalled();
  });

  it("passes search query to count and page fetchers", async () => {
    const { GET } = await import("@/app/api/email-trackers/[competitor_id]/route");
    const res = await GET(
      new Request(`http://localhost/api/email-trackers/${competitorId}?q=SAVE20`),
      { params: Promise.resolve({ competitor_id: competitorId }) },
    );
    expect(res.status).toBe(200);
    expect(countMock).toHaveBeenCalledWith(expect.anything(), "user-1", competitorId, "SAVE20");
    expect(pageMock).toHaveBeenCalledWith(
      expect.objectContaining({ q: "SAVE20", competitorId }),
    );
    const json = await res.json();
    expect(json.searchQuery).toBe("SAVE20");
  });

  it("locks insights below threshold", async () => {
    const { GET } = await import("@/app/api/email-trackers/[competitor_id]/route");
    const res = await GET(
      new Request(`http://localhost/api/email-trackers/${competitorId}?view=insights`),
      { params: Promise.resolve({ competitor_id: competitorId }) },
    );
    expect(res.status).toBe(200);
    expect(buildInsightsMock).toHaveBeenCalledWith({
      emailCount: 3,
      rows: [],
      truncated: false,
    });
  });
});
