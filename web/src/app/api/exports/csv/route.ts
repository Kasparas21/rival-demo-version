import { NextResponse } from "next/server";
import { getPostHogServerClient, getPostHogDistinctId } from "@/lib/analytics/posthog-server";
import {
  featureNotAvailableResponseBody,
  getBillingEntitlement,
  quotaExceededResponseBody,
} from "@/lib/billing/entitlements";
import { loadMonthlyUsageSnapshot, utcYearMonth } from "@/lib/billing/usage-quotas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveWorkspaceContext } from "@/lib/team/workspace-context";

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
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
  let domain: string | undefined;
  try {
    const body = (await req.json()) as { competitorId?: string; domain?: string };
    competitorId = body.competitorId?.trim();
    domain = body.domain?.trim();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const usage = await loadMonthlyUsageSnapshot(supabase, user.id, utcYearMonth());
  if (
    !billing.isUnlimited &&
    usage.csvExportCount >= billing.limits.csvExportsPerMonth
  ) {
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

  let query = supabase
    .from("scraped_ads")
    .select("platform, stable_ad_key, first_seen_at, last_seen_at, ad_text, format")
    .eq("user_id", dataUserId)
    .is("archived_at", null)
    .order("last_seen_at", { ascending: false })
    .limit(billing.limits.csvMaxAdsPerExport);

  if (competitorId) {
    query = query.eq("competitor_id", competitorId);
  } else if (domain) {
    const { data: comp } = await supabase
      .from("saved_competitors")
      .select("id")
      .eq("user_id", dataUserId)
      .or(`slug.eq.${domain},brand_domain.eq.${domain}`)
      .limit(1)
      .maybeSingle();
    if (!comp?.id) {
      return NextResponse.json({ ok: false, error: "competitor not found" }, { status: 404 });
    }
    query = query.eq("competitor_id", comp.id);
  } else {
    return NextResponse.json({ ok: false, error: "competitorId or domain required" }, { status: 400 });
  }

  const { data: rows, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const ads = rows ?? [];
  const header = ["platform", "stable_ad_key", "format", "ad_text", "first_seen_at", "last_seen_at"];
  const lines = [header.join(",")];
  for (const row of ads) {
    lines.push(
      [
        csvEscape(row.platform),
        csvEscape(row.stable_ad_key),
        csvEscape(row.format),
        csvEscape(row.ad_text),
        csvEscape(row.first_seen_at),
        csvEscape(row.last_seen_at),
      ].join(","),
    );
  }

  if (!billing.isUnlimited) {
    await supabase.rpc("increment_csv_export_usage", { p_ads_count: ads.length });
  }

  const posthog = getPostHogServerClient();
  if (posthog) {
    const distinctId = (await getPostHogDistinctId()) ?? user.id;
    posthog.capture({
      distinctId,
      event: "csv_exported",
      properties: {
        user_id: user.id,
        ad_count: ads.length,
        competitor_id: competitorId ?? null,
        domain: domain ?? null,
      },
    });
  }

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rival-export-${Date.now()}.csv"`,
    },
  });
}
