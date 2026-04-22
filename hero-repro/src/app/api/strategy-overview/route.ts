import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import {
  parseStrategyCardsFromUnknown,
  type StrategyOverviewRequestBody,
  type StrategyOverviewResponse,
} from "@/lib/strategy-overview-types";

const SYSTEM_PROMPT = `You are a world-class performance marketing strategist. You analyze paid ad data across platforms to reverse-engineer a competitor's full growth and funnel strategy. You think like a CMO and media buyer combined.

You will receive a JSON array of ads scraped from multiple ad platforms for a single brand. Each ad has: platform, headline, body copy, CTA, format, and when it was first seen.

Analyze ALL ads together and return ONLY a valid JSON array (no markdown, no preamble) of strategy insight cards. Each card must follow this exact shape:
{
  "id": "unique_snake_case_id",
  "type": "funnel" | "platform_role" | "creative" | "offer" | "messaging" | "seasonality" | "gap",
  "title": "short bold insight title",
  "body": "2-4 sentence strategic paragraph. Be specific, cite actual ad copy patterns you observed. No generic fluff.",
  "platforms": ["meta", "google"] // platforms most relevant to this insight
}

Return between 5 and 8 cards. Prioritize insights in this order:
1. Funnel architecture (TOFU/MOFU/BOFU and which platforms serve which stage)
2. Platform role mapping (what job each platform is hired to do)
3. Creative strategy (hooks, formats, emotional vs rational messaging)
4. Offer & CTA patterns (discounts, urgency, trial offers detected)
5. Messaging pillars (recurring themes across all copy)
6. Seasonality signals (inferred from ad volume / dates if available)
7. Strategic gaps (what this brand is NOT doing that they should be)

Be direct, specific, and performance-marketing-driven. Reference actual copy patterns you see in the data.`;

function isRequestBody(v: unknown): v is StrategyOverviewRequestBody {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (typeof o.competitorName !== "string" || !o.competitorName.trim()) return false;
  if (typeof o.competitorDomain !== "string" || !o.competitorDomain.trim()) return false;
  if (typeof o.adsHash !== "string" || !o.adsHash.trim()) return false;
  if (o.force !== undefined && typeof o.force !== "boolean") return false;
  if (!Array.isArray(o.ads)) return false;
  for (const ad of o.ads) {
    if (!ad || typeof ad !== "object") return false;
    const a = ad as Record<string, unknown>;
    if (typeof a.platform !== "string") return false;
    if (typeof a.headline !== "string") return false;
    if (typeof a.body !== "string") return false;
    if (typeof a.cta !== "string") return false;
    if (typeof a.format !== "string") return false;
  }
  return true;
}

function stripJsonFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return t.trim();
}

type AnthropicContentBlock = { type: string; text?: string };

type AnthropicMessageResponse = {
  content?: AnthropicContentBlock[];
  error?: { message?: string };
};

export async function POST(req: Request): Promise<NextResponse<StrategyOverviewResponse>> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isRequestBody(body)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid request: competitorName, competitorDomain, ads[], and adsHash required",
      },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const domainNorm = body.competitorDomain.trim().toLowerCase();
  const force = body.force === true;

  if (user && !force) {
    const { data: cached, error: cacheError } = await supabase
      .from("strategy_overview_cache")
      .select("cards, ads_hash")
      .eq("user_id", user.id)
      .eq("competitor_domain", domainNorm)
      .maybeSingle();

    if (!cacheError && cached && cached.ads_hash === body.adsHash) {
      const cards = parseStrategyCardsFromUnknown(cached.cards as unknown);
      if (cards) {
        return NextResponse.json({ ok: true, cards, cached: true });
      }
    }
  }

  const userContent = [
    `Competitor: ${body.competitorName.trim()}`,
    `Domain: ${body.competitorDomain.trim()}`,
    "",
    "Ads (JSON array):",
    JSON.stringify(body.ads),
    "",
    "Respond with ONLY a JSON array of 5 to 8 strategy cards. No markdown fences, no explanation.",
  ].join("\n");

  let anthropicJson: AnthropicMessageResponse;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    anthropicJson = (await res.json()) as AnthropicMessageResponse;

    if (!res.ok) {
      const msg =
        anthropicJson.error?.message ||
        (typeof anthropicJson === "object" && anthropicJson !== null && "message" in anthropicJson
          ? String((anthropicJson as { message?: string }).message)
          : null) ||
        `Anthropic request failed (${res.status})`;
      return NextResponse.json({ ok: false, error: msg }, { status: 502 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Anthropic request failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }

  const blocks = anthropicJson.content;
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return NextResponse.json({ ok: false, error: "Empty response from model" }, { status: 502 });
  }

  const textBlock = blocks.find((b) => b.type === "text" && typeof b.text === "string");
  const rawText = textBlock?.text;
  if (!rawText?.trim()) {
    return NextResponse.json({ ok: false, error: "No text content from model" }, { status: 502 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(rawText));
  } catch {
    return NextResponse.json(
      { ok: false, error: "Model returned invalid JSON" },
      { status: 502 }
    );
  }

  const cards = parseStrategyCardsFromUnknown(parsed);
  if (!cards) {
    return NextResponse.json(
      { ok: false, error: "Model JSON did not match expected card shape (need 5–8 valid cards)" },
      { status: 502 }
    );
  }

  if (user) {
    const { error: upsertError } = await supabase.from("strategy_overview_cache").upsert(
      {
        user_id: user.id,
        competitor_domain: domainNorm,
        competitor_name: body.competitorName.trim(),
        cards: cards as unknown as Json,
        snapshot: "",
        ads_hash: body.adsHash,
      },
      { onConflict: "user_id,competitor_domain" }
    );
    if (upsertError) {
      // Still return success for Anthropic; log-only path could be added
      console.error("strategy_overview_cache upsert:", upsertError.message);
    }
  }

  return NextResponse.json({ ok: true, cards, cached: false });
}
