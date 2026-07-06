import Firecrawl from "@mendable/firecrawl-js";

import { createDiscoverFirecrawlClient } from "@/lib/competitor-discover-firecrawl";
import { llmFast } from "@/lib/llm/anthropic";

import type { LandingPageText } from "./constants";
import { MIN_PAGE_TEXT_CHARS } from "./constants";

function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  try {
    const parsed = JSON.parse(candidate) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(candidate.slice(start, end + 1)) as unknown;
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function toLandingPageText(raw: Record<string, unknown> | null, markdownFallback: string): LandingPageText {
  if (!raw) {
    return { full_text: markdownFallback.slice(0, 1000) };
  }
  const pricing = raw.pricing_tiers;
  return {
    headline: typeof raw.headline === "string" ? raw.headline : undefined,
    subheadline: typeof raw.subheadline === "string" ? raw.subheadline : undefined,
    cta_text: typeof raw.cta_text === "string" ? raw.cta_text : undefined,
    pricing_tiers: Array.isArray(pricing)
      ? pricing.filter((v): v is string => typeof v === "string")
      : undefined,
    full_text:
      typeof raw.full_text === "string"
        ? raw.full_text
        : markdownFallback.slice(0, 1000),
  };
}

async function scrapePageMarkdown(
  app: InstanceType<typeof Firecrawl>,
  url: string,
): Promise<string> {
  const attempts = [
    { formats: [{ type: "markdown" as const }], onlyMainContent: false, fastMode: true, timeout: 22_000 },
    { formats: [{ type: "markdown" as const }], onlyMainContent: false, fastMode: false, timeout: 28_000, waitFor: 1500 },
    {
      formats: [{ type: "markdown" as const }],
      onlyMainContent: false,
      fastMode: false,
      timeout: 32_000,
      waitFor: 2500,
      proxy: "stealth" as const,
    },
  ];

  for (const opts of attempts) {
    try {
      const doc = await app.scrape(url, opts);
      const markdown = typeof doc.markdown === "string" ? doc.markdown.trim() : "";
      if (markdown) return markdown;
    } catch {
      /* next attempt */
    }
  }
  return "";
}

export async function extractPageText(url: string): Promise<LandingPageText> {
  if (!process.env.FIRECRAWL_API_KEY?.trim()) {
    return { full_text: "" };
  }

  const app = createDiscoverFirecrawlClient();
  const markdown = await scrapePageMarkdown(app, url);

  if (!markdown) {
    return { full_text: "" };
  }

  const prompt = `Extract these fields from the following landing page content.
Return ONLY a JSON object, no preamble, no markdown.

{
  "headline": "the main H1 headline",
  "subheadline": "the subheadline or tagline below the hero",
  "cta_text": "the primary call-to-action button text",
  "pricing_tiers": ["array of plan names or prices if pricing page"],
  "full_text": "first 1000 characters of page text"
}

Page content:
${markdown.slice(0, 3000)}`;

  const llm = await llmFast({
    task: "landing_page_text_extract",
    messages: [{ role: "user", content: prompt }],
    maxTokens: 500,
  });

  if (!llm.ok) {
    return { full_text: markdown.slice(0, 1000) };
  }

  return toLandingPageText(parseJsonObject(llm.text), markdown);
}

export function isPageTextNearEmpty(pageText: LandingPageText): boolean {
  const full = pageText.full_text?.trim() ?? "";
  const headline = pageText.headline?.trim() ?? "";
  const combined = full || headline;
  return combined.length < MIN_PAGE_TEXT_CHARS;
}
