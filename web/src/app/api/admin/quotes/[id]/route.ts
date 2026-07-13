import { NextResponse } from "next/server";

import { authorizeAdminRequest, adminCanWrite } from "@/lib/admin/auth";
import { parsePlanLimitsFromJson, planLimitsToJson } from "@/lib/billing/custom-quotes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

type PatchBody = {
  status?: "draft" | "revoked";
  priceCents?: number;
  trialDays?: number;
  limits?: Record<string, unknown>;
  internalNotes?: string;
  salesNotes?: string;
};

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const auth = await authorizeAdminRequest(req, supabase, user?.id ?? null);
  if (!auth.ok || !adminCanWrite(auth.admin.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin.from("custom_quotes").select("*").eq("id", id).maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }
  if (existing.status === "accepted") {
    return NextResponse.json({ error: "Accepted quotes cannot be edited" }, { status: 400 });
  }

  const patch: {
    updated_at: string;
    price_cents?: number;
    trial_days?: number;
    internal_notes?: string | null;
    sales_notes?: string | null;
    status?: string;
    limits?: Json;
  } = { updated_at: new Date().toISOString() };
  if (typeof body.priceCents === "number") patch.price_cents = body.priceCents;
  if (typeof body.trialDays === "number") patch.trial_days = body.trialDays;
  if (body.internalNotes !== undefined) patch.internal_notes = body.internalNotes?.trim() || null;
  if (body.salesNotes !== undefined) patch.sales_notes = body.salesNotes?.trim() || null;
  if (body.status) patch.status = body.status;
  if (body.limits) {
    const current = parsePlanLimitsFromJson(existing.limits);
    if (current) {
      patch.limits = planLimitsToJson({ ...current, ...body.limits } as typeof current);
    }
  }

  const { data, error } = await admin.from("custom_quotes").update(patch).eq("id", id).select("*").single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, quote: data });
}
