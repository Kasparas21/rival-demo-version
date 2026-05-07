import { NextResponse } from "next/server";

import { billingRequiredResponseBody, getBillingEntitlement } from "@/lib/billing/entitlements";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { runBrandComparisonLlm } from "@/lib/brand-comparison/run-brand-comparison-llm";

export const runtime = "nodejs";
export const maxDuration = 120;

type Body = {
  competitor?: { name?: string; domain?: string };
  userBrand?: { name?: string; domain?: string; brandContext?: string };
  adEvidence?: string;
};

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const billing = await getBillingEntitlement(supabase, user.id);
  if (!billing.hasAccess) {
    return NextResponse.json(
      billingRequiredResponseBody("Start your subscription to run brand comparisons."),
      { status: 402 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const competitorName = body.competitor?.name?.trim() || "";
  const competitorDomain = body.competitor?.domain?.trim() || "";
  const userBrandName = body.userBrand?.name?.trim() || "";
  if (!competitorName || !competitorDomain || !userBrandName) {
    return NextResponse.json(
      { ok: false, error: "competitor.name, competitor.domain, and userBrand.name are required" },
      { status: 400 }
    );
  }

  const adEvidence = typeof body.adEvidence === "string" ? body.adEvidence : "";

  const out = await runBrandComparisonLlm({
    competitorName,
    competitorDomain,
    userBrandName,
    userBrandDomain: body.userBrand?.domain?.trim() || undefined,
    userBrandContext: body.userBrand?.brandContext?.trim() || undefined,
    adEvidence,
  });

  if (!out.ok) {
    const status = out.error.includes("OPENROUTER_API_KEY") ? 503 : 502;
    return NextResponse.json({ ok: false, error: out.error, model: out.model }, { status });
  }

  return NextResponse.json({ ok: true, model: out.model, comparison: out.result });
}
