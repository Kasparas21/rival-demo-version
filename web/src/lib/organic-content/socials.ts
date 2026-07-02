import { ORGANIC_SCRAPE_MAX_ITEMS } from "./constants";
import { ORGANIC_PLATFORMS, organicSocialsSchema, type OrganicPlatform, type OrganicSocials } from "./types";

export type PlatformActorInputOpts = {
  newerThan?: string | null;
};

export function parseOrganicSocials(raw: unknown): OrganicSocials {
  const parsed = organicSocialsSchema.safeParse(raw ?? {});
  if (!parsed.success) return {};
  const out: OrganicSocials = {};
  for (const key of ORGANIC_PLATFORMS) {
    const v = parsed.data[key]?.trim();
    if (v) out[key] = v;
  }
  return out;
}

export function hasAnyOrganicSocial(socials: OrganicSocials): boolean {
  return ORGANIC_PLATFORMS.some((p) => Boolean(socials[p]?.trim()));
}

/** Platforms that gained a handle for the first time (empty/missing → non-empty). */
export function findNewlyAddedPlatforms(
  prev: OrganicSocials,
  next: OrganicSocials,
): OrganicPlatform[] {
  return ORGANIC_PLATFORMS.filter((platform) => {
    const nextHandle = next[platform]?.trim();
    const prevHandle = prev[platform]?.trim();
    return Boolean(nextHandle) && !prevHandle;
  });
}

export function normalizeHandleForPlatform(platform: OrganicPlatform, handle: string): string {
  const t = handle.trim();
  if (!t) return t;
  if (platform === "twitter" || platform === "instagram" || platform === "tiktok") {
    return t.replace(/^@/, "");
  }
  if (t.startsWith("http")) return t;
  if (platform === "facebook") return `https://facebook.com/${t.replace(/^@/, "")}`;
  if (platform === "youtube") return t.startsWith("http") ? t : `https://youtube.com/@${t.replace(/^@/, "")}`;
  if (platform === "linkedin") return t.startsWith("http") ? t : `https://linkedin.com/company/${t}`;
  return t;
}

export function buildPlatformActorInput(
  platform: OrganicPlatform,
  handle: string,
  opts?: PlatformActorInputOpts,
): Record<string, unknown> {
  const normalized = normalizeHandleForPlatform(platform, handle);
  switch (platform) {
    case "linkedin":
      return { profileUrl: normalized, maxItems: 20 };
    case "twitter":
      return { twitterHandles: [normalized.replace(/^@/, "")], maxItems: 20 };
    case "instagram": {
      const input: Record<string, unknown> = {
        usernames: [normalized.replace(/^@/, "")],
        postsPerProfile: ORGANIC_SCRAPE_MAX_ITEMS,
      };
      if (opts?.newerThan) input.newerThan = opts.newerThan;
      return input;
    }
    case "tiktok":
      return { profiles: [normalized.replace(/^@/, "")], resultsPerPage: 20 };
    case "facebook":
      return { startUrls: [{ url: normalized }], maxPosts: 20 };
    case "youtube":
      return { channelUrl: normalized, maxResults: 20 };
    default:
      return {};
  }
}
