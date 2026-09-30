import { McpToolError, mcpSuccess } from "@/lib/mcp/errors";
import { MCP_AD_GALLERY_MAX, attachAdGallery, galleryCaption, loadGalleryCards } from "@/lib/mcp/ad-gallery-app";
import { mcpCreativeFields } from "@/lib/mcp/ad-creative-media";
import { mcpAdPreviewUrl } from "@/lib/mcp/ad-image-token";
import { mcpAdLinksForScrapedRow } from "@/lib/mcp/ad-links";
import type { McpToolContext } from "@/lib/mcp/tool-context";
import { formatAdCopyForMcp } from "@/lib/mcp/format-ad-copy";

const SCRAPED_SELECT =
  "id, competitor_id, platform, format, ad_text, ad_creative_url, archived_creative_url, raw_payload, first_seen_at, last_seen_at, is_active";
const SAVED_SELECT =
  "id, competitor_id, platform, format, ad_text, ad_creative_url, archived_creative_url, raw_payload, source_scraped_ad_id, saved_at";

type CreativeRow = {
  id: string;
  competitor_id: string;
  platform: string;
  format: string | null;
  ad_text: string | null;
  ad_creative_url: string | null;
  archived_creative_url: string | null;
  raw_payload: unknown;
  source_scraped_ad_id?: string | null;
};

export type GetAdCreativeInput = {
  ad_id?: string;
  ad_ids?: string[];
};

function uniqueIds(input: GetAdCreativeInput): string[] {
  const raw = [input.ad_id, ...(input.ad_ids ?? [])]
    .map((id) => id?.trim() ?? "")
    .filter(Boolean);
  return [...new Set(raw)].slice(0, MCP_AD_GALLERY_MAX);
}

function asSource(row: {
  id: string;
  platform: string;
  format?: string | null;
  ad_creative_url: string | null;
  archived_creative_url?: string | null;
  raw_payload: unknown;
}) {
  return {
    id: row.id,
    platform: row.platform,
    format: row.format,
    ad_creative_url: row.ad_creative_url,
    archived_creative_url: row.archived_creative_url,
    raw_payload: row.raw_payload,
  };
}

export async function getAdCreative(ctx: McpToolContext, input: GetAdCreativeInput) {
  const ids = uniqueIds(input);
  if (!ids.length) {
    throw new McpToolError("invalid_input", "ad_id or ad_ids is required.");
  }

  const { data: scrapedRows, error: scrapedErr } = await ctx.supabase
    .from("scraped_ads")
    .select(SCRAPED_SELECT)
    .eq("user_id", ctx.auth.userId)
    .in("id", ids);
  if (scrapedErr) throw scrapedErr;

  const scrapedById = new Map((scrapedRows ?? []).map((row) => [row.id, row as CreativeRow]));
  const missing = ids.filter((id) => !scrapedById.has(id));

  const savedByLookup = new Map<string, CreativeRow>();
  if (missing.length) {
    const { data: savedById } = await ctx.supabase
      .from("saved_ads")
      .select(SAVED_SELECT)
      .eq("user_id", ctx.auth.userId)
      .in("id", missing);
    for (const row of savedById ?? []) {
      savedByLookup.set(row.id, row as CreativeRow);
    }

    const stillMissing = missing.filter((id) => !savedByLookup.has(id));
    if (stillMissing.length) {
      const { data: savedBySource } = await ctx.supabase
        .from("saved_ads")
        .select(SAVED_SELECT)
        .eq("user_id", ctx.auth.userId)
        .in("source_scraped_ad_id", stillMissing);
      for (const row of savedBySource ?? []) {
        const sourceId = row.source_scraped_ad_id?.trim();
        if (sourceId && !savedByLookup.has(sourceId)) savedByLookup.set(sourceId, row as CreativeRow);
      }
    }
  }

  const competitorIds = [
    ...new Set(
      [...scrapedById.values(), ...savedByLookup.values()]
        .map((row) => row.competitor_id)
        .filter(Boolean),
    ),
  ];
  const competitorById = new Map<string, { name: string; domain: string | null }>();
  if (competitorIds.length) {
    const { data: comps } = await ctx.supabase
      .from("saved_competitors")
      .select("id, name, brand_name, brand_domain")
      .eq("user_id", ctx.auth.userId)
      .in("id", competitorIds);
    for (const row of comps ?? []) {
      competitorById.set(row.id, {
        name: row.brand_name?.trim() || row.name?.trim() || "Competitor",
        domain: row.brand_domain?.trim() || null,
      });
    }
  }

  const ads: Array<Record<string, unknown>> = [];
  const gallerySources: Array<{
    id: string;
    competitor: string;
    caption: string;
    format: string;
    sourceUrls: Array<string | null | undefined>;
    openUrl?: string;
  }> = [];

  for (const id of ids) {
    const scraped = scrapedById.get(id);
    const saved = savedByLookup.get(id);
    const row = scraped ?? saved;
    if (!row) {
      ads.push({
        id,
        found: false,
        visual_inlined: false,
        message: "Ad not found in this account.",
      });
      continue;
    }

    const source = asSource(row);
    const refs = mcpCreativeFields(source, ctx.auth.appOrigin);
    if (refs.image_url || row.archived_creative_url || row.ad_creative_url) {
      gallerySources.push({
        id: row.id,
        competitor: competitorById.get(row.competitor_id)?.name ?? "Ad",
        caption: galleryCaption(row.ad_text),
        format: refs.visual_kind === "video" ? "video" : (row.format ?? "image"),
        sourceUrls: [refs.image_url, row.archived_creative_url, row.ad_creative_url],
        openUrl: mcpAdPreviewUrl(ctx.auth.appOrigin, ctx.auth.userId, row.id),
      });
    }

    const competitor = competitorById.get(row.competitor_id);
    const links = mcpAdLinksForScrapedRow(
      ctx.auth.appOrigin,
      competitor?.domain ?? null,
      row.platform,
      scraped?.id ?? saved?.source_scraped_ad_id ?? row.id,
      row.raw_payload,
    );
    const copy = formatAdCopyForMcp(row.ad_text ?? "", true);

    ads.push({
      id: scraped?.id ?? saved?.id ?? id,
      requested_id: id,
      found: true,
      source: scraped ? "scraped_ads" : "saved_ads",
      competitor: competitor
        ? { id: row.competitor_id, name: competitor.name, domain: competitor.domain }
        : { id: row.competitor_id },
      platform: row.platform,
      format: row.format,
      visual_kind: refs.visual_kind,
      image_url: refs.image_url,
      video_url: refs.video_url,
      shown_in_chat_gallery: Boolean(refs.image_url || row.archived_creative_url || row.ad_creative_url),
      ad_text: copy.ad_text,
      truncated: copy.truncated,
      spy_rival_url: links.spy_rival_url,
      platform_library_url: links.platform_library_url,
      note: refs.image_url || row.archived_creative_url || row.ad_creative_url
        ? "Creative is in the inline chat gallery. Matching assistant-only image blocks are attached to this tool result — describe what is visible in those pixels. The user can expand, copy, and download the gallery image."
        : "No still image is stored for this ad.",
    });
  }

  const gallery = await loadGalleryCards(gallerySources.slice(0, MCP_AD_GALLERY_MAX));
  const shown = new Set(gallery.map((card) => card.id));
  for (const ad of ads) {
    if (ad.found === true) ad.shown_in_chat_gallery = shown.has(String(ad.id));
  }

  return attachAdGallery(
    mcpSuccess({
      ads,
      gallery_count: gallery.length,
      hint: gallery.length
        ? "An inline image gallery is rendered in the chat. creative_vision_count image blocks on this result are the same creatives — describe the pixels. Do not replace the gallery with a list of links, and do not claim the image was not returned."
        : "No creative image could be resolved for these ads.",
    }),
    gallery,
  );
}
