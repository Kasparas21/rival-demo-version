import type { SupabaseClient } from "@supabase/supabase-js";

import type { DiscoveryAssistantAttachmentInput } from "@/lib/discovery/discovery-assistant-attachments";
import { hydrateDiscoveryMetaAdCard } from "@/lib/discovery/hydrate-discovery-meta-ad";
import { loadDiscoveryAdsByIds } from "@/lib/discovery/load-discovery-ads-by-ids";
import type { DiscoveryAdDto } from "@/lib/discovery/types";
import type { Database } from "@/lib/supabase/types";

const MAX_TEXT_ATTACHMENT_CHARS = 8_000;
const MAX_VISION_IMAGES = 4;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function adCopyFields(ad: DiscoveryAdDto): Record<string, string> {
  const fields: Record<string, string> = {
    competitor: ad.competitor_name,
    format: ad.format || "unknown",
    ad_text: ad.ad_text?.trim() || "",
  };

  if (isRecord(ad.raw_payload)) {
    const raw = ad.raw_payload as Record<string, unknown>;
    const headline = typeof raw.headline === "string" ? raw.headline.trim() : "";
    const desc = typeof raw.desc === "string" ? raw.desc.trim() : "";
    const cta = typeof raw.cta === "string" ? raw.cta.trim() : "";
    if (headline) fields.headline = headline;
    if (desc) fields.primary_text = desc;
    if (cta) fields.cta = cta;
  }

  const hydrated = hydrateDiscoveryMetaAdCard(ad);
  if (hydrated?.card) {
    if (!fields.headline && hydrated.card.headline?.trim()) fields.headline = hydrated.card.headline.trim();
    if (!fields.primary_text && hydrated.card.desc?.trim()) fields.primary_text = hydrated.card.desc.trim();
    if (!fields.cta && hydrated.card.cta?.trim()) fields.cta = hydrated.card.cta.trim();
  }

  return fields;
}

function creativeUrlForAd(ad: DiscoveryAdDto): string | null {
  return ad.archived_creative_url?.trim() || ad.ad_creative_url?.trim() || null;
}

async function fetchImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    if (!mime.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 2 * 1024 * 1024) return null;
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

async function describeImage(label: string, dataUrl: string): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;

  const model =
    process.env.LLM_MODEL_DISCOVERY_VISION?.trim() ||
    process.env.LLM_MODEL_DISCOVERY_CHAT?.trim() ||
    "anthropic/claude-sonnet-4-6";

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(45_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(process.env.OPENROUTER_HTTP_REFERER?.trim()
          ? { "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER.trim() }
          : {}),
        "X-Title": process.env.OPENROUTER_APP_TITLE?.trim() ?? "Rival",
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `${label}\n\nDescribe this image for ad creative analysis: visual hook, on-image text, mood, offer cues. Be specific and concise (max 120 words).` },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) return null;
    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  }
}

async function buildVisionNotes(
  images: Array<{ label: string; dataUrl: string }>,
): Promise<string[]> {
  const notes: string[] = [];
  for (const image of images.slice(0, MAX_VISION_IMAGES)) {
    const description = await describeImage(image.label, image.dataUrl);
    if (description) notes.push(`[${image.label}]\n${description}`);
  }
  return notes;
}

export type DiscoveryAssistantContextResult = {
  enrichedMessage: string;
  selectedAds: DiscoveryAdDto[];
  contextSummary: string;
};

export async function buildDiscoveryAssistantUserContext(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  message: string;
  selectedAdIds?: string[];
  attachments?: DiscoveryAssistantAttachmentInput[];
}): Promise<DiscoveryAssistantContextResult> {
  const sections: string[] = [];
  const selectedAds =
    params.selectedAdIds?.length
      ? await loadDiscoveryAdsByIds(params.supabase, params.userId, params.selectedAdIds)
      : [];

  if (selectedAds.length) {
    const adBlocks = selectedAds.map((ad, i) => {
      const copy = adCopyFields(ad);
      const creative = creativeUrlForAd(ad);
      return [
        `Ad ${i + 1} (id: ${ad.id})`,
        `Competitor: ${copy.competitor}`,
        `Format: ${copy.format}`,
        copy.headline ? `Headline: ${copy.headline}` : null,
        copy.primary_text ? `Primary text: ${copy.primary_text}` : null,
        copy.ad_text ? `Ad text: ${copy.ad_text}` : null,
        copy.cta ? `CTA: ${copy.cta}` : null,
        creative ? `Creative URL: ${creative}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    });
    sections.push(`USER-SELECTED ADS (${selectedAds.length}):\n${adBlocks.join("\n\n")}`);
  }

  const attachmentTexts: string[] = [];
  const visionQueue: Array<{ label: string; dataUrl: string }> = [];

  for (const attachment of params.attachments ?? []) {
    if (attachment.kind === "text" && attachment.textContent?.trim()) {
      const clipped = attachment.textContent.trim().slice(0, MAX_TEXT_ATTACHMENT_CHARS);
      attachmentTexts.push(
        `File "${attachment.name}" (${attachment.mimeType}):\n${clipped}`,
      );
    } else if (attachment.kind === "image" && attachment.dataUrl?.trim()) {
      visionQueue.push({ label: `User upload: ${attachment.name}`, dataUrl: attachment.dataUrl.trim() });
    }
  }

  for (const ad of selectedAds.slice(0, 2)) {
    const url = creativeUrlForAd(ad);
    if (!url) continue;
    const dataUrl = url.startsWith("data:") ? url : await fetchImageDataUrl(url);
    if (dataUrl) {
      visionQueue.push({
        label: `Selected ad creative — ${ad.competitor_name}`,
        dataUrl,
      });
    }
  }

  if (attachmentTexts.length) {
    sections.push(`USER FILE ATTACHMENTS:\n${attachmentTexts.join("\n\n")}`);
  }

  const visionNotes = await buildVisionNotes(visionQueue);
  if (visionNotes.length) {
    sections.push(`VISUAL ANALYSIS:\n${visionNotes.join("\n\n")}`);
  }

  const contextSummary = sections.join("\n\n");
  const enrichedMessage = contextSummary
    ? `${contextSummary}\n\nUSER MESSAGE:\n${params.message.trim()}`
    : params.message.trim();

  return { enrichedMessage, selectedAds, contextSummary };
}

export function historyContentWithContext(
  content: string,
  contextSummary?: string,
  selectedAdIds?: string[],
): string {
  const parts = [content.trim()];
  if (selectedAdIds?.length) {
    parts.push(`[Referenced ${selectedAdIds.length} selected ad(s)]`);
  }
  if (contextSummary?.trim()) {
    const clipped = contextSummary.trim().slice(0, 600);
    parts.push(`[Context: ${clipped}${contextSummary.length > 600 ? "…" : ""}]`);
  }
  return parts.join("\n");
}
