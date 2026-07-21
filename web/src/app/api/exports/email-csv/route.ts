import { NextResponse } from "next/server";

import { getPostHogServerClient, getPostHogDistinctId } from "@/lib/analytics/posthog-server";
import {
  featureNotAvailableResponseBody,
  getBillingEntitlement,
  quotaExceededResponseBody,
} from "@/lib/billing/entitlements";
import { EMAIL_INSIGHTS_MAX_ROWS } from "@/lib/email-intelligence/constants";
import { loadMonthlyUsageSnapshot, utcYearMonth } from "@/lib/billing/usage-quotas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveWorkspaceContext } from "@/lib/team/workspace-context";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function parseOffers(raw: unknown): Array<{ type: string; value: string; code: string | null }> {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (o): o is { type: string; value: string; code: string | null } =>
      typeof o === "object" &&
      o !== null &&
      typeof (o as { type?: unknown }).type === "string" &&
      typeof (o as { value?: unknown }).value === "string",
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(supabase, user.id);
  const dataUserId = ctx.dataUserId;

  const billing = await getBillingEntitlement(supabase, dataUserId);
  if (!billing.limits.allowCsvExport && !billing.isUnlimited) {
    return NextResponse.json(featureNotAvailableResponseBody("CSV export"), { status: 403 });
  }

  let competitorId: string | undefined;
  try {
    const body = (await req.json()) as { competitorId?: string };
    competitorId = body.competitorId?.trim();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ ok: false, error: "competitorId required" }, { status: 400 });
  }

  const usage = await loadMonthlyUsageSnapshot(supabase, user.id, utcYearMonth());
  if (!billing.isUnlimited && usage.csvExportCount >= billing.limits.csvExportsPerMonth) {
    return NextResponse.json(
      quotaExceededResponseBody({
        used: usage.csvExportCount,
        requested: 1,
        limit: billing.limits.csvExportsPerMonth,
        metric: "CSV exports",
      }),
      { status: 402 },
    );
  }

  const { data: rows, error } = await supabase
    .from("competitor_emails")
    .select(
      "received_at, subject, from_name, from_email, email_type, esp_detected, ai_angle, ai_summary, ai_offers, ai_cta",
    )
    .eq("user_id", dataUserId)
    .eq("competitor_id", competitorId)
    .order("received_at", { ascending: false })
    .limit(EMAIL_INSIGHTS_MAX_ROWS);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const header = [
    "received_at",
    "subject",
    "from_name",
    "from_email",
    "email_type",
    "esp_detected",
    "ai_angle",
    "ai_summary",
    "offer_value",
    "offer_code",
    "offer_type",
    "ai_cta",
  ];
  const lines = [header.join(",")];
  let rowCount = 0;

  for (const row of rows ?? []) {
    const offers = parseOffers(row.ai_offers);
    if (offers.length === 0) {
      lines.push(
        [
          csvEscape(row.received_at),
          csvEscape(row.subject),
          csvEscape(row.from_name),
          csvEscape(row.from_email),
          csvEscape(row.email_type),
          csvEscape(row.esp_detected),
          csvEscape(row.ai_angle),
          csvEscape(row.ai_summary),
          "",
          "",
          "",
          csvEscape(row.ai_cta),
        ].join(","),
      );
      rowCount += 1;
      continue;
    }
    for (const offer of offers) {
      lines.push(
        [
          csvEscape(row.received_at),
          csvEscape(row.subject),
          csvEscape(row.from_name),
          csvEscape(row.from_email),
          csvEscape(row.email_type),
          csvEscape(row.esp_detected),
          csvEscape(row.ai_angle),
          csvEscape(row.ai_summary),
          csvEscape(offer.value),
          csvEscape(offer.code),
          csvEscape(offer.type),
          csvEscape(row.ai_cta),
        ].join(","),
      );
      rowCount += 1;
    }
  }

  if (!billing.isUnlimited) {
    await supabase.rpc("increment_csv_export_usage", { p_ads_count: rowCount });
  }

  const posthog = getPostHogServerClient();
  if (posthog) {
    const distinctId = (await getPostHogDistinctId()) ?? user.id;
    posthog.capture({
      distinctId,
      event: "email_csv_exported",
      properties: {
        user_id: user.id,
        row_count: rowCount,
        competitor_id: competitorId,
      },
    });
  }

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rival-email-export-${Date.now()}.csv"`,
    },
  });
}
