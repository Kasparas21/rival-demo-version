import type { OrganicPlatform } from "./types";

import {
  dedupeOrganicMediaUrls,
  extractTwitterViewsFromRaw,
  filterFacebookPageLogoFromPostMedia,
  isFacebookPageLogoMediaUrl,
  organicMediaUrlsMatch,
  repairOrganicMediaFromRaw,
} from "./normalize";
import { isPersistedOrganicMediaUrl } from "./archive-organic-previews";

export type OrganicMediaAspect = "square" | "vertical" | "landscape";

export type OrganicPostDisplayFields = {
  post_url: string | null;
  product_type: string | null;
  author_username: string | null;
  author_display_name: string | null;
  author_avatar_url: string | null;
  media_aspect: OrganicMediaAspect;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function extractAuthor(
  raw: Record<string, unknown>,
  platform: OrganicPlatform,
): Pick<OrganicPostDisplayFields, "author_username" | "author_display_name" | "author_avatar_url"> {
  const user = asRecord(raw.user);
  const author = asRecord(raw.author);
  const authorMeta = asRecord(raw.authorMeta);

  switch (platform) {
    case "instagram": {
      const username = pickString(user?.username, raw.scraped_username);
      return {
        author_username: username,
        author_display_name: pickString(user?.full_name, user?.fullName, username),
        author_avatar_url: pickString(user?.profile_pic_url, user?.profilePicUrl),
      };
    }
    case "twitter":
      return {
        author_username: pickString(
          author?.screen_name,
          author?.userName,
          author?.username,
          user?.screen_name,
          raw.screen_name,
        ),
        author_display_name: pickString(author?.name, user?.name, raw.name),
        author_avatar_url: pickString(
          author?.profile_image_url_https,
          author?.profilePicture,
          author?.profileImageUrl,
          user?.profile_image_url_https,
          raw.profileImageUrl,
        ),
      };
    case "linkedin": {
      const avatar = asRecord(author?.avatar);
      return {
        author_username: pickString(
          author?.universalName,
          author?.publicIdentifier,
          raw.author_username,
          author?.username,
          raw.publicIdentifier,
        ),
        author_display_name: pickString(author?.name, raw.author_name, raw.authorName, raw.author_display_name),
        author_avatar_url: pickString(
          avatar?.url,
          raw.author_avatar_url,
          author?.profilePicture,
          author?.avatar,
          raw.authorImage,
        ),
      };
    }
    case "tiktok":
      return {
        author_username: pickString(authorMeta?.name, raw.author, author?.uniqueId, author?.name),
        author_display_name: pickString(authorMeta?.nickName, authorMeta?.nickname, author?.nickname),
        author_avatar_url: pickString(authorMeta?.avatar, author?.avatarThumb, author?.avatar),
      };
    case "youtube": {
      const channel = asRecord(raw.channel);
      return {
        author_username: pickString(
          channel?.handle as string | undefined,
          channel?.url as string | undefined,
          raw.channelUsername,
          raw.channelHandle,
          raw.channel_url,
          raw.channelUrl,
          asRecord(raw.details)?.author as string | undefined,
        ),
        author_display_name: pickString(
          channel?.name as string | undefined,
          raw.channel_name,
          raw.channelName,
          raw.channelTitle,
          raw.uploader,
          asRecord(raw.details)?.author as string | undefined,
        ),
        author_avatar_url: pickString(raw.channelAvatarUrl, raw.channelThumbnail, raw.uploaderAvatar),
      };
    }
    case "facebook":
      return {
        author_username: pickString(raw.pageName, user?.name, raw.userName, raw.pageUrl),
        author_display_name: pickString(user?.name, raw.pageName, raw.userName),
        author_avatar_url: pickString(user?.profilePic, user?.profilePicture, raw.pageProfilePicture),
      };
    default:
      return {
        author_username: null,
        author_display_name: null,
        author_avatar_url: null,
      };
  }
}

function inferMediaAspect(
  raw: Record<string, unknown>,
  platform: OrganicPlatform,
  productType: string | null,
): OrganicMediaAspect {
  if (productType === "clips" || platform === "tiktok") return "vertical";
  if (platform === "youtube") {
    if (productType === "short" || raw.isShort === true) return "vertical";
    const videoUrl = pickString(raw.video_url, raw.url, raw.post_url);
    if (videoUrl && /youtube\.com\/shorts\//i.test(videoUrl)) return "vertical";
    return "landscape";
  }

  if (platform === "instagram") {
    if (productType === "feed") return "square";
    const width = typeof raw.original_width === "number" ? raw.original_width : null;
    const height = typeof raw.original_height === "number" ? raw.original_height : null;
    if (width && height) {
      const ratio = width / height;
      if (ratio < 0.85) return "vertical";
      if (ratio > 1.15) return "landscape";
      return "square";
    }
    return "square";
  }

  if (platform === "linkedin") {
    if (productType === "video") return "landscape";
    const postImages = raw.postImages;
    if (Array.isArray(postImages) && postImages.length > 0) {
      const first = asRecord(postImages[0]);
      const width = typeof first?.width === "number" ? first.width : null;
      const height = typeof first?.height === "number" ? first.height : null;
      if (width && height) {
        const ratio = width / height;
        if (ratio < 0.85) return "vertical";
        if (ratio > 1.15) return "landscape";
        return "square";
      }
    }
    const coverPages = asRecord(raw.document)?.coverPages;
    if (Array.isArray(coverPages) && coverPages.length > 0) {
      const first = asRecord(coverPages[0]);
      const width = typeof first?.width === "number" ? first.width : null;
      const height = typeof first?.height === "number" ? first.height : null;
      if (width && height) {
        const ratio = width / height;
        if (ratio < 0.85) return "vertical";
        if (ratio > 1.15) return "landscape";
        return "square";
      }
    }
  }

  if (platform === "facebook") {
    if (productType === "carousel") return "landscape";
    if (productType === "reel" || productType === "video" || productType === "clips") return "vertical";
    const postUrl = pickString(raw.url, raw.post_url, raw.postUrl);
    if (postUrl && /facebook\.com\/reel\//i.test(postUrl)) return "vertical";
    const mediaArr = raw.media;
    if (Array.isArray(mediaArr) && mediaArr.length > 0) {
      const first = asRecord(mediaArr[0]);
      const width = typeof first?.width === "number" ? first.width : null;
      const height = typeof first?.height === "number" ? first.height : null;
      if (width && height) {
        const ratio = width / height;
        if (ratio < 0.85) return "vertical";
        if (ratio > 1.15) return "landscape";
        return "square";
      }
      if (first?.__typename === "Video") return "vertical";
    }
  }

  if (platform === "twitter") {
    const extended = asRecord(raw.extended_entities);
    const media = Array.isArray(extended?.media) ? extended.media[0] : null;
    const mediaRec = asRecord(media);
    const originalInfo = asRecord(mediaRec?.original_info);
    const width = typeof originalInfo?.width === "number" ? originalInfo.width : null;
    const height = typeof originalInfo?.height === "number" ? originalInfo.height : null;
    if (width && height) {
      const ratio = width / height;
      if (ratio < 0.85) return "vertical";
      if (ratio > 1.15) return "landscape";
      return "square";
    }
  }

  const width = typeof raw.width === "number" ? raw.width : null;
  const height = typeof raw.height === "number" ? raw.height : null;
  if (width && height) {
    const ratio = width / height;
    if (ratio < 0.85) return "vertical";
    if (ratio > 1.15) return "landscape";
    return "square";
  }

  return "landscape";
}

export function organicPostDisplayFields(
  raw_data: unknown,
  platform: OrganicPlatform,
): OrganicPostDisplayFields {
  const raw = asRecord(raw_data);
  if (!raw) {
    return {
      post_url: null,
      product_type: null,
      author_username: null,
      author_display_name: null,
      author_avatar_url: null,
      media_aspect: platform === "tiktok" ? "vertical" : platform === "youtube" ? "landscape" : "landscape",
    };
  }

  const product_type = pickString(raw.product_type, raw.productType);
  const author = extractAuthor(raw, platform);

  return {
    post_url: pickString(
      raw.post_url,
      raw.linkedinUrl,
      raw.video_url,
      raw.url,
      raw.postUrl,
      raw.link,
      raw.webVideoUrl,
    ),
    product_type,
    ...author,
    media_aspect: inferMediaAspect(raw, platform, product_type),
  };
}

export function enrichOrganicPostForApi<
  T extends {
    raw_data?: unknown;
    views?: number;
    platform?: string;
    media_urls?: string[];
    archived_preview_url?: string | null;
  },
>(post: T): T & OrganicPostDisplayFields & { views: number; media_urls: string[] } {
  const platform = (post.platform ?? "instagram") as OrganicPlatform;
  const display = organicPostDisplayFields(post.raw_data, platform);
  const storedViews = post.views ?? 0;
  const rawViews = platform === "twitter" ? extractTwitterViewsFromRaw(post.raw_data) : 0;
  const repaired = repairOrganicMediaFromRaw(platform, post.raw_data);
  const stored = post.media_urls ?? [];
  const hasPersistedArchive =
    stored.some((url) => isPersistedOrganicMediaUrl(url)) ||
    Boolean(post.archived_preview_url?.trim() && isPersistedOrganicMediaUrl(post.archived_preview_url));
  let sourceUrls: string[];
  if (platform === "linkedin" && repaired.length > stored.length) {
    sourceUrls = [...repaired, ...stored];
  } else if (hasPersistedArchive && stored.length > 0) {
    sourceUrls = stored;
  } else {
    sourceUrls = repaired.length > 0 ? repaired : stored;
  }
  const fallback = dedupeOrganicMediaUrls(sourceUrls, platform);
  const archived = post.archived_preview_url?.trim();
  const rawRow = asRecord(post.raw_data);
  let media_urls: string[];
  if (archived) {
    const archivedIsPageLogo =
      platform === "facebook" && isFacebookPageLogoMediaUrl(archived, post.raw_data);
    const withoutArchived = fallback.filter((url) => !organicMediaUrlsMatch(url, archived, platform));
    if (archivedIsPageLogo && withoutArchived.length > 0) {
      media_urls = withoutArchived;
    } else if (fallback.some((url) => organicMediaUrlsMatch(url, archived, platform))) {
      media_urls = fallback;
    } else {
      media_urls = [archived, ...withoutArchived];
    }
  } else {
    media_urls = fallback;
  }
  if (platform === "facebook" && rawRow) {
    media_urls = filterFacebookPageLogoFromPostMedia(media_urls, rawRow);
  }
  media_urls = dedupeOrganicMediaUrls(media_urls, platform);

  let product_type = display.product_type;
  if (!product_type && platform === "linkedin" && media_urls.length > 1) {
    product_type = rawRow?.document ? "document" : "carousel";
  }

  return {
    ...post,
    ...display,
    product_type,
    media_urls,
    views: storedViews > 0 ? storedViews : rawViews,
  };
}

export function toOrganicPostClientPayload<
  T extends {
    raw_data?: unknown;
    views?: number;
    platform?: string;
    media_urls?: string[];
    archived_preview_url?: string | null;
  },
>(post: T): Omit<T & OrganicPostDisplayFields, "raw_data"> & { views: number; media_urls: string[] } {
  const enriched = enrichOrganicPostForApi(post);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { raw_data, ...client } = enriched;
  return {
    ...client,
    views: enriched.views,
    media_urls: enriched.media_urls,
  };
}
