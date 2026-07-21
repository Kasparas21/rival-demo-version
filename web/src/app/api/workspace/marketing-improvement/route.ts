import { NextResponse } from "next/server";

import { billingRequiredResponseBody, getBillingEntitlement } from "@/lib/billing/entitlements";
import { isDebugPlatformClassificationEnabled } from "@/lib/debug/platform-classification";
import {
  isSidebarRowLikelyWorkspaceBrand,
  MAX_WATCHED_COMPETITORS,
  type SidebarCompetitor,
} from "@/lib/sidebar-competitors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveWorkspaceContext } from "@/lib/team/workspace-context";
import { buildCrossChannelEvidenceText } from "@/lib/workspace/build-cross-channel-evidence";
import { runMarketingImprovementLlm } from "@/lib/workspace/run-marketing-improvement-llm";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_COMPETITORS_IN_PROMPT = Math.min(MAX_WATCHED_COMPETITORS, 10);

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(supabase, user.id);
  const dataUserId = ctx.dataUserId;

  if (!isDebugPlatformClassificationEnabled()) {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }

  const billing = await getBillingEntitlement(supabase, dataUserId);
  if (!billing.hasAccess) {
    return NextResponse.json(
      billingRequiredResponseBody("Start your subscription to run marketing improvement coaching."),
      { status: 402 },
    );
  }

  let body: { userBrandName?: unknown; userBrandDomain?: unknown; userBrandContext?: unknown };
  try {
    body = (await req.json()) as {
      userBrandName?: unknown;
      userBrandDomain?: unknown;
      userBrandContext?: unknown;
    };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const userBrandName = typeof body.userBrandName === "string" ? body.userBrandName.trim() : "";
  if (!userBrandName) {
    return NextResponse.json({ ok: false, error: "userBrandName is required" }, { status: 400 });
  }
  const userBrandDomain = typeof body.userBrandDomain === "string" ? body.userBrandDomain.trim() : "";
  const userBrandContext = typeof body.userBrandContext === "string" ? body.userBrandContext.trim() : "";

  const { data: savedRows, error: savedErr } = await supabase
    .from("saved_competitors")
    .select("id, slug, name, brand_name, brand_domain, is_workspace_brand")
    .eq("user_id", dataUserId)
    .order("updated_at", { ascending: false })
    .limit(MAX_WATCHED_COMPETITORS + 4);

  if (savedErr) {
    return NextResponse.json({ ok: false, error: savedErr.message }, { status: 500 });
  }

  const rivals = (savedRows ?? [])
    .filter((r) => {
      if (r.is_workspace_brand) return false;
      const pseudo: SidebarCompetitor = {
        slug: r.slug,
        name: r.name ?? "",
        pending: false,
        ...(r.brand_name && r.brand_domain
          ? { brand: { name: r.brand_name, domain: r.brand_domain } }
          : {}),
      };
      return !isSidebarRowLikelyWorkspaceBrand(pseudo, userBrandDomain || null);
    })
    .slice(0, MAX_COMPETITORS_IN_PROMPT);

  if (rivals.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Add watched competitors first (Spy / sidebar). Coaching compares you to brands you follow.",
      },
      { status: 400 },
    );
  }

  const { text: evidenceText, hasCompetitorEvidence } = await buildCrossChannelEvidenceText({
    supabase,
    userId: dataUserId,
    rivals: rivals.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      brand_name: r.brand_name,
      brand_domain: r.brand_domain,
    })),
    userBrandDomain: userBrandDomain || undefined,
  });

  if (!hasCompetitorEvidence) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No competitor evidence yet. Open rivals' Ads Library, Organic, Website, or Email tabs (or refresh scrapes) so we can compare channels.",
      },
      { status: 400 },
    );
  }

  const out = await runMarketingImprovementLlm({
    userBrandName,
    userBrandDomain: userBrandDomain || undefined,
    userBrandContext: userBrandContext || undefined,
    evidenceText,
  });

  if (!out.ok) {
    const status = out.error.includes("OPENROUTER_API_KEY") ? 503 : 502;
    return NextResponse.json({ ok: false, error: out.error, model: out.model }, { status });
  }

  return NextResponse.json({
    ok: true,
    model: out.model,
    competitorsConsidered: rivals.map((r) => ({
      name: r.brand_name?.trim() || r.name?.trim() || r.slug,
      domain: r.brand_domain?.trim() || r.slug,
    })),
    coaching: out.result,
  });
}
