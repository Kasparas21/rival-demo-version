import { NextResponse } from "next/server";

import { authorizeAdminRequest, adminCanWrite } from "@/lib/admin/auth";
import { customQuotesMigrationHelp, isMissingCustomQuotesTableError } from "@/lib/admin/migration-help";
import {
  defaultCustomQuoteLimits,
  planLimitsToJson,
} from "@/lib/billing/custom-quotes";
import { parsePlanLimitsFromJson } from "@/lib/billing/custom-quotes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type QuoteBody = {
  userId?: string;
  priceCents?: number;
  currency?: string;
  billingPeriod?: "monthly" | "annual";
  trialDays?: number;
  limits?: Record<string, unknown>;
  internalNotes?: string;
  salesNotes?: string;
  expiresInDays?: number;
};

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const auth = await authorizeAdminRequest(req, supabase, user);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status")?.trim();
  const admin = createSupabaseAdminClient();

  let query = admin.from("custom_quotes").select("*").order("created_at", { ascending: false }).limit(200);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, quotes: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const auth = await authorizeAdminRequest(req, supabase, user);
  if (!auth.ok || !adminCanWrite(auth.admin.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: QuoteBody;
  try {
    body = (await req.json()) as QuoteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userId = body.userId?.trim();
  const priceCents = body.priceCents;
  if (!userId || typeof priceCents !== "number" || priceCents < 0) {
    return NextResponse.json({ error: "userId and priceCents (>= 0) are required" }, { status: 400 });
  }

  const defaults = defaultCustomQuoteLimits();
  const limitsInput = body.limits ?? {};
  const mergedLimits = { ...defaults, ...limitsInput };
  const limits = parsePlanLimitsFromJson(planLimitsToJson(mergedLimits as typeof defaults)) ?? defaults;

  const expiresInDays = body.expiresInDays ?? 30;
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + expiresInDays);

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("custom_quotes")
    .insert({
      user_id: userId,
      status: "draft",
      price_cents: priceCents,
      currency: (body.currency ?? "gbp").toLowerCase(),
      billing_period: body.billingPeriod ?? "monthly",
      trial_days: body.trialDays ?? 7,
      limits: planLimitsToJson(limits),
      internal_notes: body.internalNotes?.trim() || null,
      sales_notes: body.salesNotes?.trim() || null,
      created_by: user!.id,
      expires_at: expiresAt.toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    const message = isMissingCustomQuotesTableError(error.message)
      ? customQuotesMigrationHelp()
      : error.message;
    return NextResponse.json(
      { error: message },
      { status: isMissingCustomQuotesTableError(error.message) ? 503 : 500 },
    );
  }

  try {
    await admin.from("admin_event_log").insert({
      actor_user_id: user!.id,
      target_user_id: userId,
      event_type: "custom_quote_created",
      payload: { quote_id: data.id } as Json,
    });
  } catch {
    // Non-blocking audit log.
  }

  return NextResponse.json({ ok: true, quote: data });
}
