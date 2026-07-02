import { runApifyActor } from "@/lib/apify/client";

import { ORGANIC_ACTOR_IDS, ORGANIC_SCRAPE_MAX_ITEMS } from "./constants";
import { normalizeOrganicItems } from "./normalize";
import { buildPlatformActorInput, type PlatformActorInputOpts } from "./socials";
import type { NormalizedOrganicPost, OrganicPlatform } from "./types";

const MAX_ACTOR_TIMEOUT_SECS = 300;

export async function scrapeOrganicPlatform(
  platform: OrganicPlatform,
  handle: string,
  opts?: PlatformActorInputOpts,
): Promise<NormalizedOrganicPost[]> {
  const actorId = ORGANIC_ACTOR_IDS[platform];
  const input = buildPlatformActorInput(platform, handle, opts);

  const { items } = await runApifyActor<unknown>(actorId, input, {
    waitSecs: MAX_ACTOR_TIMEOUT_SECS,
    timeoutSecs: MAX_ACTOR_TIMEOUT_SECS,
    maxItems: ORGANIC_SCRAPE_MAX_ITEMS,
  });

  return normalizeOrganicItems(platform, items).slice(0, ORGANIC_SCRAPE_MAX_ITEMS);
}

export async function scrapeOrganicPlatformSafe(
  platform: OrganicPlatform,
  handle: string,
  opts?: PlatformActorInputOpts,
): Promise<{ posts: NormalizedOrganicPost[]; error?: string }> {
  try {
    const posts = await scrapeOrganicPlatform(platform, handle, opts);
    return { posts };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[organic] ${platform} scrape failed:`, message);
    return { posts: [], error: message };
  }
}
