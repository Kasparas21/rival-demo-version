import { NextResponse } from "next/server";
import { CHANNELS, type ChannelId } from "@/components/channel-picker-modal";
import {
  FALLBACK_SEARCH_KEYS,
  refineSnapchatWithBrand,
  normalizeDiscoveredIds,
  pickBestFacebookPageUrl,
  extractDomain,
  toFullUrl,
  type PlatformIdentifier,
  type SearchHit,
} from "@/lib/discovery";
import { extractPinterestHandleFromUrlOrString } from "@/lib/ad-library/pinterest-handle";
import {
  createDiscoverFirecrawlClient,
  scrapeWithFallbacks,
  tryResolveMetaPageIdFromFacebookUrls,
  fallbackSearchForSocials,
  buildFieldConfidence,
  buildFieldPreviewUrls,
} from "@/lib/competitor-discover-firecrawl";

/** Second-pass discovery while confirming profiles — deeper homepage mine + targeted web search. */
export const maxDuration = 55;

export type DiscoverRefineChannelsResponse = {
  success: boolean;
  discoveredPatch?: Partial<PlatformIdentifier>;
  fieldConfidencePatch?: Partial<Record<ChannelId, "high" | "medium" | "low">>;
  fieldPreviewUrlsPatch?: Partial<Record<ChannelId, string>>;
  /** Number of newly filled channel fields (excluding sidecar fields counted separately below). */
  filledChannelCount?: number;
  metaPageUrlFilled?: boolean;
  pinterestAdvertiserFilled?: boolean;
  message?: string;
  error?: string;
};

function normalizeDomainInput(raw: string): string | null {
  const t = raw.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0] ?? "";
  if (!t || !/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(t)) return null;
  return t.toLowerCase();
}

function channelLooksEmpty(ids: Partial<PlatformIdentifier>, id: ChannelId): boolean {
  if (id === "meta") return !(ids.meta?.trim() || ids.metaPageUrl?.trim());
  const v = ids[id];
  return !(typeof v === "string" && v.trim());
}

export async function POST(req: Request): Promise<NextResponse<DiscoverRefineChannelsResponse>> {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const domainRaw = typeof body.domain === "string" ? body.domain : "";
    const normalizedDomain = normalizeDomainInput(domainRaw);
    const brandName = typeof body.brandName === "string" ? body.brandName.trim() : "";
    const searchPhrase =
      typeof body.searchPhrase === "string" && body.searchPhrase.trim()
        ? body.searchPhrase.trim()
        : brandName;
    const seedIds = (body.seedIds && typeof body.seedIds === "object" ? body.seedIds : {}) as Partial<
      PlatformIdentifier
    >;
    const rawChannels = Array.isArray(body.channels) ? body.channels : [];
    const requested = [...new Set(rawChannels)].filter((c): c is ChannelId =>
      CHANNELS.some((ch) => ch.id === c)
    );

    if (!normalizedDomain || !brandName) {
      return NextResponse.json(
        { success: false, error: "Missing domain or brand name" },
        { status: 400 }
      );
    }
    if (requested.length === 0) {
      return NextResponse.json(
        { success: false, error: "Select at least one platform to search" },
        { status: 400 }
      );
    }

    const targets = requested.filter((id) => channelLooksEmpty(seedIds, id));
    if (targets.length === 0) {
      return NextResponse.json({
        success: true,
        discoveredPatch: {},
        filledChannelCount: 0,
        message: "Those fields already have values — clear a field to search again.",
      });
    }

    let app: ReturnType<typeof createDiscoverFirecrawlClient>;
    try {
      app = createDiscoverFirecrawlClient();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "FIRECRAWL_API_KEY is not configured — profile search is unavailable.",
        },
        { status: 503 }
      );
    }

    const landingUrl = toFullUrl(normalizedDomain);
    const scraped = await scrapeWithFallbacks(app, landingUrl, { enrichLinksFromPageHtml: true });
    const fromScrapeIds: Partial<PlatformIdentifier> = scraped?.discoveredIds ?? {
      google: extractDomain(landingUrl),
    };
    const scrapeLinks = scraped?.links ?? [];
    const scrapeSucceeded = Boolean(scraped);

    let working: Partial<PlatformIdentifier> = { ...seedIds };
    for (const t of targets) {
      const hit = fromScrapeIds[t];
      if (typeof hit === "string" && hit.trim()) {
        working[t] = hit;
      }
    }

    const stillMissing = targets.filter((t) => channelLooksEmpty(working, t));
    const fallbackKeys = stillMissing.filter((t) =>
      FALLBACK_SEARCH_KEYS.includes(t as (typeof FALLBACK_SEARCH_KEYS)[number])
    ) as (keyof PlatformIdentifier)[];

    const ctx = { safeName: brandName, domain: normalizedDomain, searchPhrase };
    const fallbackBundle =
      fallbackKeys.length > 0
        ? await fallbackSearchForSocials(app, ctx, fallbackKeys)
        : { ids: {} as Partial<PlatformIdentifier>, allHits: [] as SearchHit[] };

    working = { ...working, ...fallbackBundle.ids };
    const scrapeLinkHits: SearchHit[] = scrapeLinks.map((u) => ({ url: u }));
    let metaHits: SearchHit[] = [...fallbackBundle.allHits, ...scrapeLinkHits];

    working = refineSnapchatWithBrand(working, metaHits, normalizedDomain);

    if (targets.includes("meta")) {
      const needMeta =
        !working.meta ||
        (working.meta && !/^\d{10,22}$/.test(String(working.meta).replace(/\D/g, "")));
      if (needMeta && metaHits.length > 0) {
        const resolved = await tryResolveMetaPageIdFromFacebookUrls(app, metaHits, working.meta);
        if (resolved) {
          working = { ...working, meta: resolved };
        }
      }
      const fbPageUrl = pickBestFacebookPageUrl(metaHits, normalizedDomain);
      if (fbPageUrl) {
        working = { ...working, metaPageUrl: fbPageUrl };
      }
    }

    if (targets.includes("pinterest") && working.pinterest?.trim()) {
      const handle = extractPinterestHandleFromUrlOrString(working.pinterest.trim());
      if (handle) working = { ...working, pinterestAdvertiserName: handle };
    }

    working = normalizeDiscoveredIds(working);

    const discoveredPatch: Partial<PlatformIdentifier> = {};

    if (targets.includes("google")) {
      const w = working.google?.trim();
      const s = seedIds.google?.trim();
      if (w && (!s || w !== s)) discoveredPatch.google = w;
    }

    for (const t of targets) {
      if (t === "google" || t === "meta") continue;
      const w = working[t];
      const s = seedIds[t];
      if (typeof w === "string" && w.trim() && String(w).trim() !== String(s ?? "").trim()) {
        discoveredPatch[t] = w;
      }
    }

    if (targets.includes("meta")) {
      if (working.meta?.trim() && working.meta !== (seedIds.meta ?? "").trim()) {
        discoveredPatch.meta = working.meta;
      }
      if (working.metaPageUrl?.trim() && working.metaPageUrl !== (seedIds.metaPageUrl ?? "").trim()) {
        discoveredPatch.metaPageUrl = working.metaPageUrl;
      }
    }

    let pinterestAdvertiserFilled = false;
    if (
      targets.includes("pinterest") &&
      working.pinterestAdvertiserName?.trim() &&
      working.pinterestAdvertiserName !== seedIds.pinterestAdvertiserName
    ) {
      discoveredPatch.pinterestAdvertiserName = working.pinterestAdvertiserName;
      pinterestAdvertiserFilled = true;
    }

    const fullConfidence = buildFieldConfidence(fromScrapeIds, working, scrapeSucceeded);
    const fullPreviews = buildFieldPreviewUrls(working, metaHits, scrapeLinks);

    const fieldConfidencePatch: Partial<Record<ChannelId, "high" | "medium" | "low">> = {};
    const fieldPreviewUrlsPatch: Partial<Record<ChannelId, string>> = {};

    const markChannel = (id: ChannelId) => {
      if (fullConfidence[id]) fieldConfidencePatch[id] = fullConfidence[id];
      if (fullPreviews[id]?.startsWith("http")) fieldPreviewUrlsPatch[id] = fullPreviews[id]!;
    };

    for (const k of Object.keys(discoveredPatch) as (keyof PlatformIdentifier)[]) {
      if (k === "metaPageUrl" || k === "meta") markChannel("meta");
      else if (k === "pinterestAdvertiserName") markChannel("pinterest");
      else if (k === "google" || k === "tiktok" || k === "linkedin" || k === "pinterest" || k === "snapchat") {
        markChannel(k);
      }
    }

    let countFilled = 0;
    if (targets.includes("meta") && (discoveredPatch.meta || discoveredPatch.metaPageUrl)) {
      countFilled++;
    }
    for (const k of ["google", "tiktok", "linkedin", "pinterest", "snapchat"] as const) {
      if (targets.includes(k) && discoveredPatch[k]) countFilled++;
    }

    const message =
      countFilled === 0
        ? "No new profiles turned up—try a web search on the brand name and paste the link manually."
        : undefined;

    return NextResponse.json({
      success: true,
      discoveredPatch,
      fieldConfidencePatch,
      fieldPreviewUrlsPatch,
      filledChannelCount: countFilled,
      metaPageUrlFilled: Boolean(discoveredPatch.metaPageUrl),
      pinterestAdvertiserFilled,
      message,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refine failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
