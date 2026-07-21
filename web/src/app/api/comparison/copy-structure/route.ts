import { NextResponse } from "next/server";
import { z } from "zod";

import { billingRequiredResponseBody, getBillingEntitlement } from "@/lib/billing/entitlements";
import { llmFast } from "@/lib/llm/anthropic";
import type { CopyStructureResult } from "@/lib/comparison/copy-structure-types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/types";
import { assertCanRunSharedAi } from "@/lib/team/permissions";
import { getRequestWorkspace } from "@/lib/team/session-workspace";

export const runtime = "nodejs";
export const maxDuration = 120;

const COPY_STRUCTURE_MODEL = "copy-structure-v1";

const copyStructureSchema: z.ZodType<CopyStructureResult> = z.object({
  hook: z.string(),
  body_framework: z.array(z.string()).min(2).max(4),
  cta_pattern: z.string(),
  emotional_register: z.string(),
  adapt_for_your_brand: z.string(),
});

function stripJsonFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return t.trim();
}

type Body = { adId?: string };

export async function POST(req: Request): Promise<NextResponse> {
  const workspace = await getRequestWorkspace();
  if (!workspace?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  assertCanRunSharedAi(ctx);

  const billing = await getBillingEntitlement(supabase, dataUserId);
  if (!billing.hasAccess) {
    return NextResponse.json(billingRequiredResponseBody("Subscription required for copy structure."), { status: 402 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const adId = typeof body.adId === "string" ? body.adId.trim() : "";
  if (!adId) {
    return NextResponse.json({ ok: false, error: "adId required" }, { status: 400 });
  }

  const { data: cached } = await supabase
    .from("ad_copy_structure_cache")
    .select("structure, ai_model_version, computed_at")
    .eq("ad_id", adId)
    .eq("user_id", dataUserId)
    .maybeSingle();

  if (cached?.structure) {
    const parsed = copyStructureSchema.safeParse(cached.structure);
    if (parsed.success) {
      return NextResponse.json({
        ok: true,
        cached: true,
        model: cached.ai_model_version,
        computed_at: cached.computed_at,
        structure: parsed.data,
      });
    }
  }

  const { data: ad, error: adErr } = await supabase
    .from("scraped_ads")
    .select("id, platform, format, ad_text, user_id")
    .eq("id", adId)
    .eq("user_id", dataUserId)
    .maybeSingle();

  if (adErr || !ad) {
    return NextResponse.json({ ok: false, error: "Ad not found" }, { status: 404 });
  }

  const adText = (ad.ad_text ?? "").trim().slice(0, 8000);
  if (!adText) {
    return NextResponse.json({ ok: false, error: "Ad has no text to analyze" }, { status: 400 });
  }

  const systemPrompt = `You are a creative strategy analyst. Given an ad's text and metadata, extract the structural pattern so it can be adapted to a different brand. Output strict JSON only with keys: hook (string), body_framework (array of 2-4 strings), cta_pattern (string), emotional_register (string), adapt_for_your_brand (string, 2-3 sentences).`;

  const userPrompt = `Analyze this ad's structure:

Platform: ${ad.platform}
Format: ${ad.format}
Ad text: """${adText}"""`;

  const res = await llmFast({
    task: "copy_structure",
    systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 1200,
  });

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 502 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(stripJsonFences(res.text));
  } catch {
    return NextResponse.json({ ok: false, error: "Model returned non-JSON" }, { status: 502 });
  }

  const checked = copyStructureSchema.safeParse(parsedJson);
  if (!checked.success) {
    return NextResponse.json({ ok: false, error: "Invalid structure shape from model" }, { status: 502 });
  }

  const structure = checked.data as CopyStructureResult;

  const upsertRow: Database["public"]["Tables"]["ad_copy_structure_cache"]["Insert"] = {
    ad_id: adId,
    user_id: dataUserId,
    structure: structure as unknown as Json,
    ai_model_version: COPY_STRUCTURE_MODEL,
  };

  const admin = createSupabaseAdminClient();
  const { error: upErr } = await admin.from("ad_copy_structure_cache").upsert(upsertRow, {
    onConflict: "ad_id",
  });
  if (upErr) {
    console.warn("[copy-structure] cache upsert", upErr.message);
  }

  return NextResponse.json({
    ok: true,
    cached: false,
    model: COPY_STRUCTURE_MODEL,
    structure,
  });
}
