import type { SupabaseClient } from "@supabase/supabase-js";

import { googleAdCopy } from "@/lib/ad-library/google-ad-copy";
import { resolveModelForTask } from "@/lib/llm/model-routing";
import type { Database } from "@/lib/supabase/types";

/**
 * Google's ad library publishes copy for about 1 in 8 ads; the rest are stored as "Advertiser — domain ·
 * Image · Shown …", so the classifier, the strategy map and the AI features knew nothing about them. Every
 * Google row links a rendered image of the ad (text ads included) holding its headline, description and
 * offer. A cheap vision model transcribes it once: about $0.0002 an image with Gemini 2.5 Flash Lite.
 */

const PROMPT = `This is a screenshot of one ad from Google's ad library. Transcribe the ad's text exactly as written, in reading order, one line per text block. Keep the original language; do not translate, summarise or describe. Skip platform labels like "Remiama" / "Sponsored" and the advertiser's URL line. If there is no readable text, write one short sentence starting with "Image:" saying what it shows.`;

const PLATFORMS = ["google", "youtube"];
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
const MODEL_TIMEOUT_MS = 30_000;
const CONCURRENCY = 4;
const MAX_TEXT_CHARS = 2000;

function imageMime(buf: Buffer): string | null {
  const hex = buf.subarray(0, 4).toString("hex");
  if (hex === "89504e47") return "image/png";
  if (hex.startsWith("ffd8ff")) return "image/jpeg";
  if (hex === "47494638") return "image/gif";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

/** The ad's image link: `img` on Google rows (an archived render on tpc.googlesyndication.com). */
export function creativeImageUrl(rawPayload: unknown): string | null {
  if (!rawPayload || typeof rawPayload !== "object") return null;
  const p = rawPayload as Record<string, unknown>;
  for (const k of ["img", "previewUrl"]) {
    const v = p[k];
    if (typeof v === "string" && /^https:\/\//.test(v) && !/\.js(\?|$)/.test(v)) return v;
  }
  return null;
}

export async function transcribeAdImage(
  imageUrl: string,
): Promise<{ ok: true; text: string; costUsd: number } | { ok: false; error: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "OPENROUTER_API_KEY not configured" };

  let buf: Buffer;
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return { ok: false, error: `image ${res.status}` };
    buf = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "image fetch failed" };
  }
  if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) return { ok: false, error: `image size ${buf.length}` };
  const mime = imageMime(buf);
  if (!mime) return { ok: false, error: "not an image" };

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": process.env.OPENROUTER_APP_TITLE?.trim() ?? "Rival",
      },
      body: JSON.stringify({
        model: resolveModelForTask("ad_creative_transcription").model,
        max_tokens: 500,
        usage: { include: true },
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mime};base64,${buf.toString("base64")}` } },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, error: `model ${res.status}: ${(await res.text()).slice(0, 160)}` };
    const json = (await res.json()) as {
      choices?: { message?: { content?: string | null } }[];
      usage?: { cost?: number };
    };
    const text = (json.choices?.[0]?.message?.content ?? "").trim();
    if (!text) return { ok: false, error: "empty transcription" };
    return { ok: true, text: text.slice(0, MAX_TEXT_CHARS), costUsd: json.usage?.cost ?? 0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "model call failed" };
  }
}

export type TranscribeStats = { candidates: number; transcribed: number; failed: number; costUsd: number };

/**
 * Transcribe active Google/YouTube ads of one competitor that have no published copy and no transcription
 * yet. By default only ads not yet classified (new ones); `includeClassified` also takes ads classified from
 * placeholder text, for a one-off backfill. Each transcribed ad is set back to pending so it gets a stage.
 */
export async function transcribeMissingAdCopy(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
  opts: { maxAds?: number; includeClassified?: boolean } = {},
): Promise<TranscribeStats> {
  const stats: TranscribeStats = { candidates: 0, transcribed: 0, failed: 0, costUsd: 0 };
  let query = supabase
    .from("scraped_ads")
    .select("id, platform, ad_text, raw_payload, ai_enrichment_status")
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .eq("is_active", true)
    .in("platform", PLATFORMS)
    .is("creative_text", null)
    .order("last_seen_at", { ascending: false })
    .limit(1000);
  if (!opts.includeClassified) {
    query = query.or("ai_enrichment_status.is.null,ai_enrichment_status.in.(pending,failed,skipped_no_text)");
  }
  const { data, error } = await query;
  if (error) {
    console.warn("[transcribe-ad-creatives] load", error.message);
    return stats;
  }

  const todo = (data ?? [])
    .filter((r) => googleAdCopy(r.ad_text).trim().length < 10)
    .map((r) => ({ id: r.id, url: creativeImageUrl(r.raw_payload) }))
    .filter((r): r is { id: string; url: string } => r.url != null)
    .slice(0, opts.maxAds ?? 150);
  stats.candidates = todo.length;

  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const item = todo[next++]!;
      const r = await transcribeAdImage(item.url);
      if (!r.ok) {
        stats.failed += 1;
        continue;
      }
      stats.costUsd += r.costUsd;
      const { error: upErr } = await supabase
        .from("scraped_ads")
        .update({ creative_text: r.text, creative_text_at: new Date().toISOString(), ai_enrichment_status: "pending" })
        .eq("id", item.id)
        .eq("user_id", userId);
      if (upErr) stats.failed += 1;
      else stats.transcribed += 1;
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
  return stats;
}
