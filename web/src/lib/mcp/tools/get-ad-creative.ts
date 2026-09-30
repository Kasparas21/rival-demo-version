import { McpToolError, mcpSuccess } from "@/lib/mcp/errors";
import {
  MCP_MAX_INLINE_VISUALS,
  MCP_VISUALS_KEY,
  fetchAdCreativeVisual,
  type McpAdCreativeSource,
  type McpImageContentBlock,
} from "@/lib/mcp/ad-creative-media";
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
  return [...new Set(raw)].slice(0, MCP_MAX_INLINE_VISUALS);
}

function asSource(row: {
  id: string;
  platform: string;
  format?: string | null;
  ad_creative_url: string | null;
  archived_creative_url?: string | null;
  raw_payload: unknown;
}): McpAdCreativeSource {
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
  const visuals: McpImageContentBlock[] = [];

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
    const { refs, image } = await fetchAdCreativeVisual(source, ctx.auth.appOrigin);
    if (image) visuals.push(image);

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
      visual_inlined: Boolean(image),
      ad_text: copy.ad_text,
      truncated: copy.truncated,
      spy_rival_url: links.spy_rival_url,
      platform_library_url: links.platform_library_url,
      note:
        refs.visual_kind === "video"
          ? image
            ? "Video ads are inlined as the poster/thumbnail image so the creative is visible in chat. video_url is the playable file."
            : "This is a video ad. No still image could be inlined; use video_url."
          : image
            ? "Creative image is attached to this tool result and visible in chat."
            : refs.image_url
              ? "Creative URL is known but the file could not be downloaded."
              : "No creative image is stored for this ad.",
    });
  }

  const payload = mcpSuccess({
    ads,
    inlined_count: visuals.length,
    hint: "Attached images appear in the same order as ads where visual_inlined=true. Analyze the pixels (layout, product, on-image text, people, offer cues) — do not only read the library URL.",
  });

  if (!visuals.length) return payload;
  return { ...payload, [MCP_VISUALS_KEY]: visuals };
}
