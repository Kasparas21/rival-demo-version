import { NextResponse } from "next/server";
import { z } from "zod";

import { isAlertType } from "@/lib/alerts/alert-types";
import { seedDefaultAlertRulesIfEmpty } from "@/lib/alerts/seed-default-rules";
import { getBillingEntitlement } from "@/lib/billing/entitlements";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const putBodySchema = z.object({
  alert_type: z.string().min(1),
  enabled: z.boolean().optional(),
  notify_email: z.boolean().optional(),
  threshold: z.record(z.string(), z.unknown()).optional(),
  competitor_id: z.string().uuid().nullable().optional(),
});

export async function GET(): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const billing = await getBillingEntitlement(supabase, user.id);

  try {
    const rules = await seedDefaultAlertRulesIfEmpty(supabase, user.id);
    return NextResponse.json({
      ok: true,
      rules,
      allowAlertRules: billing.limits.allowAlertRules,
      allowAlertEmail: billing.limits.allowAlertEmail,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load rules";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const billing = await getBillingEntitlement(supabase, user.id);
  if (!billing.limits.allowAlertRules) {
    return NextResponse.json({ ok: false, error: "Upgrade to Pro to customize alert rules" }, { status: 403 });
  }

  let body: z.infer<typeof putBodySchema>;
  try {
    body = putBodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  if (!isAlertType(body.alert_type)) {
    return NextResponse.json({ ok: false, error: "Invalid alert_type" }, { status: 400 });
  }

  if (body.notify_email === true && !billing.limits.allowAlertEmail) {
    return NextResponse.json({ ok: false, error: "Alert emails require Pro" }, { status: 403 });
  }

  const competitorId = body.competitor_id ?? null;

  const row = {
    user_id: user.id,
    alert_type: body.alert_type,
    enabled: body.enabled ?? true,
    notify_email: body.notify_email ?? false,
    threshold: (body.threshold ?? {}) as Json,
    competitor_id: competitorId,
  };

  const { data, error } = await supabase
    .from("alert_rules")
    .upsert(row, { onConflict: "user_id,alert_type,competitor_id" })
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rule: data });
}
