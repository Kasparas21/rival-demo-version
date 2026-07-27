import { resolveAdLibrarySourceUrl } from "@/lib/ad-detail/resolve-ad-library-url";
import { mcpDashboardUrl } from "@/lib/mcp/urls";

export type McpAdLinks = {
  /** Deep link to open this ad in Spy Rival (detail drawer). */
  spy_rival_url: string;
  /** Direct link to this ad in the platform ad library / transparency center, when known. */
  platform_library_url: string | null;
};

export function mcpSpyRivalAdUrl(
  appOrigin: string,
  competitorDomain: string | null,
  scrapedAdId: string,
): string {
  const id = scrapedAdId.trim();
  return mcpDashboardUrl(appOrigin, competitorDomain, `tab=ads&ad=${encodeURIComponent(id)}`);
}

export function mcpAdLinksForScrapedRow(
  appOrigin: string,
  competitorDomain: string | null,
  platform: string,
  scrapedAdId: string,
  rawPayload: unknown,
): McpAdLinks {
  return {
    spy_rival_url: mcpSpyRivalAdUrl(appOrigin, competitorDomain, scrapedAdId),
    platform_library_url: resolveAdLibrarySourceUrl(platform, rawPayload),
  };
}
