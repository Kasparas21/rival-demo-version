import { ORGANIC_SCRAPE_MAX_ITEMS } from "./constants";
import { ORGANIC_PLATFORMS, organicSocialsSchema, type NormalizedOrganicPost, type OrganicPlatform, type OrganicSocials } from "./types";

export type PlatformActorInputOpts = {
  newerThan?: string | null;
  /** Extra brand/@handle slugs when YouTube is saved as /channel/UC… (search works; channel tabs often don't on Apify). */
  youtubeSearchSlugs?: string[];
};

export function parseOrganicSocials(raw: unknown): OrganicSocials {
  const parsed = organicSocialsSchema.safeParse(raw ?? {});
  if (!parsed.success) return {};
  const out: OrganicSocials = {};
  for (const key of ORGANIC_PLATFORMS) {
    const v = parsed.data[key]?.trim();
    if (!v) continue;
    out[key] = key === "youtube" ? youtubeChannelBaseUrl(v) : v;
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

/** Extract @handle from x.com/twitter.com URLs or plain handles. */
export function extractTwitterUsername(handle: string): string {
  const t = handle.trim().replace(/^@/, "");
  if (!t) return t;

  try {
    if (/^https?:\/\//i.test(t)) {
      const u = new URL(t);
      const host = u.hostname.replace(/^www\./, "").toLowerCase();
      if (host === "x.com" || host === "twitter.com") {
        const segment = u.pathname.split("/").filter(Boolean)[0];
        if (segment && !["i", "search", "home", "intent", "hashtag"].includes(segment.toLowerCase())) {
          return segment;
        }
      }
    }
  } catch {
    // fall through
  }

  const inlineMatch = /(?:twitter\.com|x\.com)\/([a-z0-9_]{1,15})/i.exec(t);
  if (inlineMatch?.[1]) return inlineMatch[1];

  return t;
}

/** Base channel URL without /videos or /shorts suffix (scrapesmith input). */
export function youtubeChannelBaseUrl(handle: string): string {
  let t = handle.trim();
  // Users sometimes paste "@https://youtube.com/..." — strip leading @ before URL detection.
  if (/^@+https?:\/\//i.test(t)) {
    t = t.replace(/^@+/, "");
  }
  if (!t) return t;

  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      const path = u.pathname.replace(/\/(videos|shorts)\/?$/i, "").replace(/\/$/, "") || "/";
      return `${u.origin}${path}`;
    } catch {
      // fall through to handle form
    }
  }

  return `https://www.youtube.com/@${t.replace(/^@/, "")}`;
}

/** Short @handle slug for keyword search — never a full URL. */
export function youtubeSearchSlugFromHandle(handle: string): string | null {
  let t = handle.trim();
  if (/^@+https?:\/\//i.test(t)) t = t.replace(/^@+/, "");
  if (!t) return null;

  if (/^https?:\/\//i.test(t)) {
    const base = youtubeChannelBaseUrl(t);
    if (/\/channel\/UC[\w-]+/i.test(base)) return null;
    const handleMatch = /\/@([\w.-]+)/i.exec(base);
    return handleMatch?.[1] ?? null;
  }

  return t.replace(/^@/, "");
}

/** Brand name → search slug (e.g. "Adidas" → "adidas"). */
export function youtubeSearchSlugFromBrandName(name: string): string | null {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "");
  return slug.length >= 2 && slug.length <= 30 ? slug : null;
}

function addYoutubeSearchSlug(slugs: Set<string>, raw: string | undefined): void {
  if (!raw?.trim()) return;
  let slug = raw.trim().replace(/^@/, "");
  if (/^https?:\/\//i.test(slug)) {
    try {
      slug = new URL(slug).pathname.split("/").filter(Boolean)[0] ?? "";
    } catch {
      return;
    }
  }
  slug = slug.toLowerCase();
  if (slug && !slug.includes("/") && slug.length <= 30) slugs.add(slug);
}

/** Search slugs from YouTube handle, other socials, and competitor brand name. */
export function deriveYoutubeSearchSlugs(
  socials: OrganicSocials,
  youtubeHandle: string,
  competitorName?: string | null,
): string[] {
  const slugs = new Set<string>();

  const fromYoutube = youtubeSearchSlugFromHandle(youtubeHandle);
  if (fromYoutube) slugs.add(fromYoutube.toLowerCase());

  const fromName = competitorName ? youtubeSearchSlugFromBrandName(competitorName) : null;
  if (fromName) slugs.add(fromName);

  addYoutubeSearchSlug(slugs, socials.instagram);
  addYoutubeSearchSlug(slugs, socials.twitter ? extractTwitterUsername(socials.twitter) : undefined);
  addYoutubeSearchSlug(slugs, socials.tiktok);

  return [...slugs];
}

export function normalizeHandleForPlatform(platform: OrganicPlatform, handle: string): string {
  const t = handle.trim();
  if (!t) return t;
  if (platform === "twitter") {
    return extractTwitterUsername(t);
  }
  if (platform === "instagram" || platform === "tiktok") {
    return t.replace(/^@/, "");
  }
  if (t.startsWith("http")) return t;
  if (platform === "facebook") return `https://facebook.com/${t.replace(/^@/, "")}`;
  if (platform === "youtube") return youtubeChannelBaseUrl(t);
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
      return {
        targetUrls: [normalized],
        maxPosts: ORGANIC_SCRAPE_MAX_ITEMS,
        scrapeReactions: false,
        scrapeComments: false,
      };
    case "twitter":
      return {
        twitterHandles: [normalized.replace(/^@/, "")],
        maxItems: ORGANIC_SCRAPE_MAX_ITEMS,
        sort: "Latest",
      };
    case "instagram": {
      const input: Record<string, unknown> = {
        usernames: [normalized.replace(/^@/, "")],
        postsPerProfile: ORGANIC_SCRAPE_MAX_ITEMS,
      };
      if (opts?.newerThan) input.newerThan = opts.newerThan;
      return input;
    }
    case "tiktok":
      return { profiles: [normalized.replace(/^@/, "")], resultsPerPage: ORGANIC_SCRAPE_MAX_ITEMS };
    case "facebook":
      return { startUrls: [{ url: normalized }], maxPosts: ORGANIC_SCRAPE_MAX_ITEMS };
    case "youtube":
      return buildCalmBuilderYouTubeShortsInput(normalized);
    default:
      return {};
  }
}

/** @handle or channel URL for calm_builder channelInputs. */
export function youtubeChannelInputForCalmBuilder(handle: string): string {
  const slug = youtubeSearchSlugFromHandle(handle);
  if (slug) return `@${slug}`;
  return youtubeChannelBaseUrl(handle);
}

/** apidojo/youtube-scraper — channel long-form videos only (includeShorts: false). */
export function buildApidojoYouTubeVideosInput(handle: string): Record<string, unknown> {
  const channelHandle = youtubeChannelInputForCalmBuilder(handle);
  const base = youtubeChannelBaseUrl(handle).replace(/\/$/, "");
  return {
    youtubeHandles: [channelHandle],
    startUrls: [`${base}/videos`],
    maxItems: ORGANIC_SCRAPE_MAX_ITEMS,
    includeShorts: false,
  };
}

/** calm_builder/youtube-scraper — channel Shorts tab only (long-form /videos tab blocked on Apify). */
export function buildCalmBuilderYouTubeShortsInput(handle: string): Record<string, unknown> {
  return {
    channelInputs: [youtubeChannelInputForCalmBuilder(handle)],
    includeChannelVideos: false,
    includeChannelShorts: true,
    maxChannelVideos: 0,
    maxChannelShorts: ORGANIC_SCRAPE_MAX_ITEMS,
    channelDateRangeSortBy: "latest",
    scrapeDetailedVideoData: false,
    scrapeCommentsAndReplies: false,
    scrapeChannelInfo: false,
  };
}

/** Ordered scrapesmith inputs — legacy actor fallback only. */
export function buildYouTubeChannelScrapeAttempts(baseChannelUrl: string): Record<string, unknown>[] {
  const base = baseChannelUrl.replace(/\/$/, "");
  const shortsCap = Math.ceil(ORGANIC_SCRAPE_MAX_ITEMS / 2);
  return [
    { channelUrls: [base], maxVideosPerQuery: ORGANIC_SCRAPE_MAX_ITEMS },
    { searchUrls: [`${base}/videos`], maxVideosPerQuery: ORGANIC_SCRAPE_MAX_ITEMS },
    { channelUrls: [`${base}/shorts`], maxVideosPerQuery: shortsCap },
  ];
}

/** Keyword search — uses @handle slug, extra brand slugs, never raw /channel/ URLs. */
export function buildYouTubeSearchFallbackInput(
  handle: string,
  maxVideosPerQuery = 30,
  extraSlugs: string[] = [],
): Record<string, unknown> | null {
  const terms: string[] = [];
  const seen = new Set<string>();

  const addSlug = (slug: string) => {
    const clean = slug.trim().replace(/^@/, "").toLowerCase();
    if (!clean || clean.includes("/") || clean.includes("http") || seen.has(clean)) return;
    seen.add(clean);
    terms.push(`@${clean}`, clean);
  };

  const fromHandle = youtubeSearchSlugFromHandle(handle);
  if (fromHandle) addSlug(fromHandle);
  for (const slug of extraSlugs) addSlug(slug);

  if (terms.length === 0) return null;
  return { searchTerms: terms, maxVideosPerQuery };
}

/** Direct channel page scrape (scrapesmith channelUrls). */
export function buildYouTubeChannelScrapeInput(handle: string): Record<string, unknown> {
  return {
    channelUrls: [youtubeChannelBaseUrl(handle)],
    maxVideosPerQuery: ORGANIC_SCRAPE_MAX_ITEMS,
  };
}

/** Probe search to resolve @handle → UC channel id when only a slug is saved. */
export function buildYouTubeChannelIdProbeInput(handle: string): Record<string, unknown> | null {
  return buildYouTubeSearchFallbackInput(handle, 5);
}

export function youtubeChannelIdFromHandle(handle: string): string | null {
  const match = /\/channel\/(UC[\w-]+)/i.exec(youtubeChannelBaseUrl(handle));
  return match?.[1] ?? null;
}

/** YouTube uploads playlist id: UCxxxx → UUxxxx */
export function youtubeUploadsPlaylistUrl(channelId: string): string {
  const id = channelId.startsWith("UC") ? `UU${channelId.slice(2)}` : channelId;
  return `https://www.youtube.com/playlist?list=${id}`;
}

export function buildYouTubePlaylistScrapeInput(channelId: string): Record<string, unknown> {
  return {
    playlistUrls: [youtubeUploadsPlaylistUrl(channelId)],
    maxVideosPerQuery: ORGANIC_SCRAPE_MAX_ITEMS,
  };
}

function youtubeRowChannelId(row: Record<string, unknown>): string | null {
  const id = row.channel_id ?? row.channelId;
  return typeof id === "string" && id.trim() ? id.trim().toLowerCase() : null;
}

function youtubeRowMatchesHandle(row: Record<string, unknown>, handle: string): boolean {
  const base = youtubeChannelBaseUrl(handle).toLowerCase();
  const slug = youtubeSearchSlugFromHandle(handle)?.toLowerCase() ?? "";
  const channelId = youtubeChannelIdFromHandle(handle)?.toLowerCase() ?? null;

  const channelUrl = String(row.channel_url ?? row.channelUrl ?? "").toLowerCase();
  const channelName = String(row.channel_name ?? row.channelName ?? "").toLowerCase();
  const channelIdRaw = youtubeRowChannelId(row);

  if (channelUrl && (channelUrl.includes(base) || channelUrl === base)) return true;
  if (slug && channelUrl.includes(`/@${slug}`)) return true;
  if (channelId && (channelUrl.includes(channelId) || channelIdRaw === channelId)) return true;
  if (slug && (channelName === slug || channelName.replace(/\s+/g, "") === slug)) return true;
  return false;
}

/** Keep only rows from the configured competitor channel (search fallback only). */
export function filterYouTubePostsForHandle(
  posts: NormalizedOrganicPost[],
  handle: string,
): NormalizedOrganicPost[] {
  const slug = youtubeSearchSlugFromHandle(handle)?.toLowerCase() ?? "";
  const channelIdFromHandle = youtubeChannelIdFromHandle(handle);
  if (!slug && !channelIdFromHandle) return posts;

  const channelIds = new Set<string>();
  if (channelIdFromHandle) channelIds.add(channelIdFromHandle.toLowerCase());

  for (const post of posts) {
    const raw = post.raw_data;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    if (youtubeRowMatchesHandle(raw as Record<string, unknown>, handle)) {
      const id = youtubeRowChannelId(raw as Record<string, unknown>);
      if (id) channelIds.add(id);
    }
  }

  return posts.filter((post) => {
    const raw = post.raw_data;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
    const row = raw as Record<string, unknown>;
    if (youtubeRowMatchesHandle(row, handle)) return true;
    const id = youtubeRowChannelId(row);
    return Boolean(id && channelIds.has(id));
  });
}

function mergePostsById(...groups: NormalizedOrganicPost[][]): NormalizedOrganicPost[] {
  const seen = new Set<string>();
  const out: NormalizedOrganicPost[] = [];
  for (const group of groups) {
    for (const post of group) {
      if (seen.has(post.post_id)) continue;
      seen.add(post.post_id);
      out.push(post);
    }
  }
  return out;
}

/** Prefer handle/name/url matching; use channel id to exclude wrong channels, not as sole gate. */
export function filterYouTubePostsForChannel(
  posts: NormalizedOrganicPost[],
  handle: string,
  channelId: string | null,
  searchSlugs: string[] = [],
): NormalizedOrganicPost[] {
  const handleGroups = [filterYouTubePostsForHandle(posts, handle)];
  for (const slug of searchSlugs) {
    handleGroups.push(filterYouTubePostsForHandle(posts, `@${slug.replace(/^@/, "")}`));
  }
  let filtered = mergePostsById(...handleGroups);

  if (filtered.length === 0 && channelId) {
    filtered = filterYouTubePostsByChannelId(posts, channelId);
  }

  if (channelId) {
    const officialId = channelId.trim().toLowerCase();
    filtered = filtered.filter((post) => {
      const raw = post.raw_data;
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
      const cid = youtubeRowChannelId(raw as Record<string, unknown>);
      // Rows without channel_id (common on Shorts) pass if handle already matched.
      if (cid && cid !== officialId) return false;
      return true;
    });
  }

  return filtered;
}

/** Strict filter once UC channel id is known (uploads playlist + search cleanup). */
export function filterYouTubePostsByChannelId(
  posts: NormalizedOrganicPost[],
  channelId: string,
): NormalizedOrganicPost[] {
  const id = channelId.trim().toLowerCase();
  if (!id.startsWith("uc")) return posts;

  return posts.filter((post) => {
    const raw = post.raw_data;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
    return youtubeRowChannelId(raw as Record<string, unknown>) === id;
  });
}
