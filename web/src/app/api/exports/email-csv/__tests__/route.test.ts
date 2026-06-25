import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const getBillingMock = vi.fn();
const loadUsageMock = vi.fn();
const emailsSelectMock = vi.fn();
const rpcMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => {
      if (table === "competitor_emails") {
        return {
          select: emailsSelectMock.mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [
              {
                received_at: "2026-06-01T12:00:00.000Z",
                subject: "Sale",
                from_name: "Shop",
                from_email: "shop@brand.com",
                email_type: "promotional",
                esp_detected: "Klaviyo",
                ai_angle: "urgency",
                ai_summary: "Summer sale",
                ai_offers: [{ type: "discount", value: "20% off", code: "SAVE20" }],
                ai_cta: "Shop now",
              },
            ],
            error: null,
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    rpc: rpcMock,
  })),
}));

vi.mock("@/lib/billing/entitlements", () => ({
  getBillingEntitlement: (...args: unknown[]) => getBillingMock(...args),
  featureNotAvailableResponseBody: (feature: string) => ({ error: feature }),
  quotaExceededResponseBody: (args: unknown) => ({ error: "quota", ...args as object }),
}));

vi.mock("@/lib/billing/usage-quotas", () => ({
  loadMonthlyUsageSnapshot: (...args: unknown[]) => loadUsageMock(...args),
  utcYearMonth: () => "2026-06",
}));

vi.mock("@/lib/analytics/posthog-server", () => ({
  getPostHogServerClient: () => null,
  getPostHogDistinctId: vi.fn(),
}));

const competitorId = "11111111-1111-4111-8111-111111111111";

describe("POST /api/exports/email-csv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    loadUsageMock.mockResolvedValue({ csvExportCount: 0 });
    rpcMock.mockResolvedValue({ error: null });
  });

  it("returns 403 without Pro csv export entitlement", async () => {
    getBillingMock.mockResolvedValue({
      limits: { allowCsvExport: false, csvExportsPerMonth: 5 },
      isUnlimited: false,
    });

    const { POST } = await import("@/app/api/exports/email-csv/route");
    const res = await POST(
      new Request("http://localhost/api/exports/email-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorId }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("returns CSV with offer columns for entitled users", async () => {
    getBillingMock.mockResolvedValue({
      limits: { allowCsvExport: true, csvExportsPerMonth: 5 },
      isUnlimited: false,
    });

    const { POST } = await import("@/app/api/exports/email-csv/route");
    const res = await POST(
      new Request("http://localhost/api/exports/email-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorId }),
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    const csv = await res.text();
    expect(csv.split("\n")[0]).toContain("offer_value");
    expect(csv).toContain("SAVE20");
    expect(csv).toContain("Summer sale");
    expect(rpcMock).toHaveBeenCalledWith("increment_csv_export_usage", { p_ads_count: 1 });
  });
});
