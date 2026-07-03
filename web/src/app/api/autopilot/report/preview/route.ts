import { NextResponse } from "next/server";

import { runAutopilotReport } from "@/lib/autopilot/run-autopilot-report";
import { reportPreviewSchema } from "@/lib/autopilot/settings-schema";
import { canEnableReports, ensureAutopilotSettings } from "@/lib/autopilot/settings-db";
import { buildReportPublicUrl } from "@/lib/autopilot/watch-deep-links";
import { getBillingEntitlement } from "@/lib/billing/entitlements";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const billing = await getBillingEntitlement(supabase, user.id);
  if (!canEnableReports(billing.planTier)) {
    return NextResponse.json({ ok: false, error: "Auto-report requires Pro or Agency" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = reportPreviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "brandId required" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: recent } = await supabase
    .from("autopilot_outputs")
    .select("id")
    .eq("user_id", user.id)
    .eq("output_type", "monthly_report")
    .like("dedupe_key", `report_preview:${user.id}:%`)
    .gte("created_at", `${today}T00:00:00.000Z`)
    .limit(1);

  if ((recent ?? []).length > 0) {
    return NextResponse.json({ ok: false, error: "Preview limit: one per day" }, { status: 429 });
  }

  await ensureAutopilotSettings(supabase, user.id);
  const admin = createSupabaseAdminClient();
  const summary = await runAutopilotReport({
    admin,
    previewBrandId: parsed.data.brandId,
    previewUserId: user.id,
  });

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://spy-rival.com";
  const { data: output } = await admin
    .from("autopilot_outputs")
    .select("id")
    .eq("user_id", user.id)
    .like("dedupe_key", `report_preview:${user.id}:${parsed.data.brandId}:${today}`)
    .maybeSingle();

  return NextResponse.json({
    ok: summary.ok,
    summary,
    reportUrl: output?.id ? buildReportPublicUrl(appOrigin, output.id, "email") : null,
  });
}
