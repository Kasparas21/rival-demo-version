import { NextResponse } from "next/server";

import {
  canEnableBrief,
  canEnableReports,
  ensureAutopilotSettings,
  rowToAutopilotSettings,
  stripAgencyOnlyFields,
} from "@/lib/autopilot/settings-db";
import { autopilotSettingsPutSchema } from "@/lib/autopilot/settings-schema";
import { getBillingEntitlement } from "@/lib/billing/entitlements";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const settings = await ensureAutopilotSettings(supabase, user.id);
    const billing = await getBillingEntitlement(supabase, user.id);
    return NextResponse.json({
      ok: true,
      settings: {
        ...settings,
        slack_webhook_url: settings.slack_webhook_url ? "••••••••" : null,
        slack_webhook_configured: Boolean(settings.slack_webhook_url?.trim()),
      },
      billing: {
        planTier: billing.planTier,
        canReports: canEnableReports(billing.planTier),
        canBrief: canEnableBrief(billing.planTier),
        isAgency: billing.planTier === "agency" || billing.planTier === "admin",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load settings" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = autopilotSettingsPutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const billing = await getBillingEntitlement(supabase, user.id);
  await ensureAutopilotSettings(supabase, user.id);

  let patch: Record<string, unknown> = { ...parsed.data };

  if (patch.report_enabled === true && !canEnableReports(billing.planTier)) {
    return NextResponse.json({ ok: false, error: "Auto-report requires Pro or Agency" }, { status: 403 });
  }

  if (patch.brief_enabled === true && !canEnableBrief(billing.planTier)) {
    return NextResponse.json({ ok: false, error: "Auto-brief requires Pro or Agency" }, { status: 403 });
  }

  patch = stripAgencyOnlyFields(patch, billing.planTier);

  if (parsed.data.slack_webhook_url === null) {
    patch.slack_webhook_url = null;
  } else if (parsed.data.slack_webhook_url === undefined) {
    delete patch.slack_webhook_url;
  }

  const { data: updated, error } = await supabase
    .from("autopilot_settings")
    .update(patch as Database["public"]["Tables"]["autopilot_settings"]["Update"])
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json({ ok: false, error: error?.message ?? "update_failed" }, { status: 500 });
  }

  const settings = rowToAutopilotSettings(updated as Record<string, unknown>);
  return NextResponse.json({
    ok: true,
    settings: {
      ...settings,
      slack_webhook_url: settings.slack_webhook_url ? "••••••••" : null,
      slack_webhook_configured: Boolean(settings.slack_webhook_url?.trim()),
    },
  });
}
