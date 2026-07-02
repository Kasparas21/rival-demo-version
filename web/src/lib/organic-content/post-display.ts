import type { OrganicPlatform } from "./types";

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
        author_username: pickString(author?.userName, author?.username, user?.screen_name, raw.screen_name),
        author_display_name: pickString(author?.name, user?.name, raw.name),
        author_avatar_url: pickString(
          author?.profilePicture,
          author?.profileImageUrl,
          user?.profile_image_url_https,
          raw.profileImageUrl,
        ),
      };
    case "linkedin":
      return {
        author_username: pickString(
          author?.username,
          author?.publicIdentifier,
          author?.vanityName,
          raw.publicIdentifier,
        ),
        author_display_name: pickString(author?.name, author?.fullName, raw.authorName),
        author_avatar_url: pickString(author?.profilePicture, author?.avatar, raw.authorImage),
      };
    case "tiktok":
      return {
        author_username: pickString(authorMeta?.name, raw.author, author?.uniqueId, author?.name),
        author_display_name: pickString(authorMeta?.nickName, authorMeta?.nickname, author?.nickname),
        author_avatar_url: pickString(authorMeta?.avatar, author?.avatarThumb, author?.avatar),
      };
    case "youtube":
      return {
        author_username: pickString(raw.channelUsername, raw.channelHandle, raw.channelUrl),
        author_display_name: pickString(raw.channelName, raw.channelTitle, raw.uploader),
        author_avatar_url: pickString(raw.channelAvatarUrl, raw.channelThumbnail, raw.uploaderAvatar),
      };
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
  if (platform === "youtube") return "landscape";

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
    post_url: pickString(raw.post_url, raw.url, raw.postUrl, raw.link, raw.webVideoUrl),
    product_type,
    ...author,
    media_aspect: inferMediaAspect(raw, platform, product_type),
  };
}

export function enrichOrganicPostForApi<
  T extends { raw_data?: unknown; views?: number; platform?: string },
>(post: T): T & OrganicPostDisplayFields & { views: number } {
  const platform = (post.platform ?? "instagram") as OrganicPlatform;
  const display = organicPostDisplayFields(post.raw_data, platform);
  return {
    ...post,
    ...display,
    views: post.views ?? 0,
  };
}
