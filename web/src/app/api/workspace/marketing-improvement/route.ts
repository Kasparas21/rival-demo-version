import { NextResponse } from "next/server";

import { buildAdEvidenceText } from "@/lib/brand-comparison/build-ad-evidence";
import { billingRequiredResponseBody, getBillingEntitlement } from "@/lib/billing/entitlements";
import { fetchLatestAdsLibraryFromUserCache } from "@/lib/ad-library/load-ads-library-from-user-cache";
import {
  normalizeCompetitorSlug,
  MAX_WATCHED_COMPETITORS,
  isSidebarRowLikelyWorkspaceBrand,
  type SidebarCompetitor,
} from "@/lib/sidebar-competitors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { runMarketingImprovementLlm } from "@/lib/workspace/run-marketing-improvement-llm";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_COMPETITORS_IN_PROMPT = Math.min(MAX_WATCHED_COMPETITORS, 10);
const EVIDENCE_PER_COMPETITOR = 3_200;
const EVIDENCE_WORKSPACE = 3_600;
const TOTAL_EVIDENCE_CAP = 42_000;

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
    .select("slug, name, brand_name, brand_domain, is_workspace_brand")
    .eq("user_id", user.id)
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
    return NextResponse.json({
      ok: false,
      error: "Add watched competitors first (Spy / sidebar). Coaching compares you to brands you follow.",
    }, { status: 400 });
  }

  const blocks: string[] = [];
  let totalChars = 0;
  let hasCompetitorCreative = false;

  for (const row of rivals) {
    const label = row.brand_name?.trim() || row.name?.trim() || row.slug;
    const hint = row.brand_domain?.trim() || row.slug?.trim();
    if (!hint) continue;

    const lib = await fetchLatestAdsLibraryFromUserCache(supabase, user.id, hint);
    const digest = buildAdEvidenceText(lib, EVIDENCE_PER_COMPETITOR).trim();
    if (digest.length > 120) hasCompetitorCreative = true;
    const header = `### Competitor: ${label} (${hint})`;
    const chunk = digest ? `${header}\n${digest}` : `${header}\n(no cached ads yet — open their Ads Library to refresh)`;
    if (totalChars + chunk.length > TOTAL_EVIDENCE_CAP) break;
    blocks.push(chunk);
    totalChars += chunk.length;
  }

  if (userBrandDomain) {
    const wsLib = await fetchLatestAdsLibraryFromUserCache(supabase, user.id, userBrandDomain);
    const digest = buildAdEvidenceText(wsLib, EVIDENCE_WORKSPACE).trim();
    const chunk = digest
      ? `### Your workspace brand (${userBrandName} · ${normalizeCompetitorSlug(userBrandDomain)})\n${digest}`
      : `### Your workspace brand (${userBrandName} · ${normalizeCompetitorSlug(userBrandDomain)})\n(no cached ads yet for your domain)`;
    if (totalChars + chunk.length <= TOTAL_EVIDENCE_CAP) {
      blocks.push(chunk);
    }
  }

  if (!hasCompetitorCreative) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No cached competitor creatives yet. Open each rival’s Ads Library tab (or refresh pulls) so we can scan what they run.",
      },
      { status: 400 },
    );
  }

  const evidenceText = blocks.join("\n\n---\n\n");

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
