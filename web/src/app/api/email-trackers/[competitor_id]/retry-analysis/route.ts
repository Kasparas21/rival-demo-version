import { NextResponse } from "next/server";

import { billingRequiredResponseBody, getBillingEntitlement } from "@/lib/billing/entitlements";
import {
  canRunEmailAiAnalysis,
  loadEmailAiAnalysisUsage,
} from "@/lib/billing/usage-quotas";
import { analyzeCompetitorEmail, resetEmailAnalysisForRetry } from "@/lib/email-intelligence/analyze";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Body = { email_id?: string };

export async function POST(
  req: Request,
  context: { params: Promise<{ competitor_id: string }> },
): Promise<NextResponse> {
  const { competitor_id: competitorIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";

  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ error: "Invalid competitor_id" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const billing = await getBillingEntitlement(supabase, user.id);
  if (!billing.hasAccess) {
    return NextResponse.json(
      billingRequiredResponseBody("Subscription required for email AI analysis."),
      { status: 402 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const emailId = typeof body.email_id === "string" ? body.email_id.trim() : "";
  if (!emailId || !UUID_RE.test(emailId)) {
    return NextResponse.json({ error: "email_id required" }, { status: 400 });
  }

  const { data: email, error: emailErr } = await supabase
    .from("competitor_emails")
    .select("id, ai_processed_at")
    .eq("id", emailId)
    .eq("user_id", user.id)
    .eq("competitor_id", competitorId)
    .maybeSingle();

  if (emailErr) {
    return NextResponse.json({ error: emailErr.message }, { status: 500 });
  }
  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  if (email.ai_processed_at) {
    return NextResponse.json({ ok: true, alreadyProcessed: true });
  }

  const usedThisMonth = await loadEmailAiAnalysisUsage(supabase, user.id);
  const quotaCheck = canRunEmailAiAnalysis(billing, usedThisMonth);
  if (!quotaCheck.ok) {
    return NextResponse.json({ ok: false, error: quotaCheck.error, quotaExceeded: true }, { status: quotaCheck.status });
  }

  const reset = await resetEmailAnalysisForRetry(emailId);
  if (!reset.ok) {
    return NextResponse.json({ error: reset.error ?? "Failed to reset analysis" }, { status: 500 });
  }

  const result = await analyzeCompetitorEmail(emailId);
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        quotaExceeded: result.quotaExceeded ?? false,
        attemptsExhausted: result.attemptsExhausted ?? false,
      },
      { status: result.quotaExceeded ? 402 : 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
