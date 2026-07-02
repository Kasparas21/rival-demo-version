import { flattenApifyDatasetRecord } from "@/lib/apify/client";

import type {
  NormalizedOrganicPost,
  OrganicCollaboratorAccount,
  OrganicPlatform,
} from "./types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function pickString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

function pickNumber(...values: unknown[]): number {
  for (const v of values) {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number.parseInt(v.replace(/,/g, ""), 10) : NaN;
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

function pickDate(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    if (typeof v === "number" && v > 0) {
      const d = new Date(v > 1e12 ? v : v * 1000);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
  }
  return null;
}

function pickCaption(row: Record<string, unknown>): string | null {
  const direct = pickString(
    row.text,
    row.content,
    row.description,
    row.message,
    row.body,
    row.title,
  );
  if (direct) return direct;

  const caption = row.caption;
  if (caption && typeof caption === "object" && !Array.isArray(caption)) {
    return pickString((caption as Record<string, unknown>).text);
  }
  return null;
}

function pickMediaUrls(row: Record<string, unknown>): string[] {
  const urls = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === "string" && v.startsWith("http")) urls.add(v);
  };

  add(row.image_url);
  add(row.video_url);
  add(row.imageUrl);
  add(row.videoUrl);

  const candidates = [
    row.mediaUrls,
    row.media_urls,
    row.images,
    row.imageUrls,
    row.thumbnailUrl,
    row.thumbnail_url,
    row.thumbnail,
    row.displayUrl,
    row.media,
  ];
  for (const c of candidates) {
    add(c);
    if (Array.isArray(c)) {
      for (const item of c) {
        add(item);
        const rec = asRecord(item);
        if (rec) {
          const u = pickString(rec.url, rec.src, rec.displayUrl, rec.imageUrl, rec.videoUrl, rec.image_url);
          if (u?.startsWith("http")) urls.add(u);
        }
      }
    }
  }
  return [...urls];
}

function mapAccounts(raw: unknown): OrganicCollaboratorAccount[] {
  if (!Array.isArray(raw)) return [];
  const out: OrganicCollaboratorAccount[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      out.push({ handle: item.replace(/^@/, "") });
      continue;
    }
    const rec = asRecord(item);
    if (!rec) continue;
    out.push({
      handle: pickString(rec.handle, rec.username, rec.screenName, rec.publicIdentifier) ?? undefined,
      username: pickString(rec.username, rec.handle) ?? undefined,
      name: pickString(rec.name, rec.fullName, rec.displayName) ?? undefined,
      url: pickString(rec.url, rec.profileUrl, rec.link) ?? undefined,
    });
  }
  return out;
}

function pickTaggedAccounts(row: Record<string, unknown>): OrganicCollaboratorAccount[] {
  const fromGeneric = mapAccounts(row.taggedUsers ?? row.tagged_accounts ?? row.mentions ?? row.tags);

  const usertags = asRecord(row.usertags);
  if (!usertags || !Array.isArray(usertags.in)) return fromGeneric;

  const fromTags: OrganicCollaboratorAccount[] = [];
  for (const tag of usertags.in) {
    const rec = asRecord(tag);
    const user = rec ? asRecord(rec.user) : null;
    if (!user) continue;
    fromTags.push({
      handle: pickString(user.username, user.handle) ?? undefined,
      username: pickString(user.username) ?? undefined,
      name: pickString(user.full_name, user.fullName, user.name) ?? undefined,
    });
  }

  return fromTags.length > 0 ? fromTags : fromGeneric;
}

function pickCoAuthors(row: Record<string, unknown>): OrganicCollaboratorAccount[] {
  return mapAccounts(
    row.coauthor_producers ?? row.coauthorProducers ?? row.coAuthors ?? row.co_authors ?? row.authors,
  );
}

function isInstagramSonesRow(row: Record<string, unknown>): boolean {
  return typeof row.code === "string" && row.code.trim() !== "" && row.taken_at != null;
}

function isClockworksTikTokRow(row: Record<string, unknown>): boolean {
  return (
    row.diggCount != null ||
    typeof row.webVideoUrl === "string" ||
    asRecord(row.videoMeta) != null ||
    typeof row["videoMeta.coverUrl"] === "string"
  );
}

function pickTikTokMediaUrls(row: Record<string, unknown>): string[] {
  const urls = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === "string" && v.startsWith("http")) urls.add(v);
  };

  const videoMeta = asRecord(row.videoMeta);
  if (videoMeta) {
    add(videoMeta.coverUrl);
    add(videoMeta.originalCoverUrl);
    add(videoMeta.dynamicCover);
  }

  add(row["videoMeta.coverUrl"]);
  add(row["videoMeta.originalCoverUrl"]);

  const covers = asRecord(row.covers);
  if (covers) {
    add(covers.default);
    add(covers.dynamic);
    add(covers.origin);
  }

  add(row.dynamicCover);
  add(row.cover);

  for (const url of pickMediaUrls(row)) {
    urls.add(url);
  }

  return [...urls];
}

function pickTikTokPostId(row: Record<string, unknown>): string | null {
  const direct = pickString(row.id, row.videoId, row.aweme_id);
  if (direct) return direct;

  const webVideoUrl = pickString(row.webVideoUrl, row.url);
  if (webVideoUrl) {
    const match = /\/video\/(\d+)/.exec(webVideoUrl);
    if (match?.[1]) return match[1];
  }
  return null;
}

function normalizeTikTokPost(
  platform: OrganicPlatform,
  row: Record<string, unknown>,
  index: number,
): NormalizedOrganicPost | null {
  const postId = pickTikTokPostId(row) ?? `${platform}-${index}`;
  const mediaUrls = pickTikTokMediaUrls(row);

  return {
    platform,
    post_id: postId,
    content: pickCaption(row),
    posted_at: pickDate(row.createTimeISO, row.createTime, row.postedAt, row.timestamp),
    likes: pickNumber(row.diggCount, row.likes, row.likesCount, row.likeCount),
    comments: pickNumber(row.commentCount, row.comments, row.commentsCount),
    shares: pickNumber(row.shareCount, row.shares, row.sharesCount, row.repostCount),
    views: pickNumber(row.playCount, row.views, row.viewCount, row.play_count),
    media_urls: mediaUrls,
    tagged_accounts: pickTaggedAccounts(row),
    co_authors: pickCoAuthors(row),
    raw_data: row,
  };
}

function normalizeInstagramSonesPost(
  platform: OrganicPlatform,
  row: Record<string, unknown>,
  index: number,
): NormalizedOrganicPost | null {
  const postId = pickString(row.code, row.shortCode, row.shortcode, row.id);
  if (!postId) return null;

  const imageUrl = pickString(row.image_url, row.imageUrl, row.displayUrl);
  const videoUrl = pickString(row.video_url, row.videoUrl);
  const mediaUrls = [imageUrl, videoUrl].filter((u): u is string => Boolean(u));
  if (mediaUrls.length === 0) {
    mediaUrls.push(...pickMediaUrls(row));
  }

  return {
    platform,
    post_id: postId,
    content: pickCaption(row),
    posted_at: pickDate(row.taken_at, row.takenAtTimestamp, row.timestamp, row.createdAt, row.postedAt),
    likes: pickNumber(row.like_count, row.likesCount, row.likes, row.likeCount),
    comments: pickNumber(row.comment_count, row.commentsCount, row.comments, row.commentCount),
    shares: pickNumber(row.share_count, row.sharesCount, row.shares, row.shareCount),
    views: pickNumber(row.play_count, row.videoViewCount, row.views, row.viewCount, row.playCount),
    media_urls: mediaUrls,
    tagged_accounts: pickTaggedAccounts(row),
    co_authors: pickCoAuthors(row),
    raw_data: row,
  };
}

function basePost(
  platform: OrganicPlatform,
  row: Record<string, unknown>,
  index: number,
): NormalizedOrganicPost | null {
  const postId =
    pickString(
      row.id,
      row.postId,
      row.post_id,
      row.urn,
      row.code,
      row.shortCode,
      row.shortcode,
      row.tweetId,
      row.videoId,
      row.url,
    ) ?? `${platform}-${index}`;

  return {
    platform,
    post_id: postId,
    content: pickCaption(row),
    media_urls: pickMediaUrls(row),
    likes: pickNumber(row.likes, row.likesCount, row.like_count, row.likeCount, row.numLikes, row.reactions, row.favoriteCount),
    comments: pickNumber(row.comments, row.commentsCount, row.comment_count, row.commentCount, row.numComments, row.replyCount),
    shares: pickNumber(row.shares, row.sharesCount, row.share_count, row.shareCount, row.retweets, row.repostCount),
    views: pickNumber(row.views, row.viewCount, row.play_count, row.playCount, row.videoViewCount),
    posted_at: pickDate(
      row.postedAt,
      row.posted_at,
      row.createdAt,
      row.created_at,
      row.taken_at,
      row.takenAtTimestamp,
      row.timestamp,
      row.time,
      row.date,
    ),
    tagged_accounts: pickTaggedAccounts(row),
    co_authors: pickCoAuthors(row),
    raw_data: row,
  };
}

export function normalizeOrganicItem(
  platform: OrganicPlatform,
  item: unknown,
  index: number,
): NormalizedOrganicPost | null {
  const flat = flattenApifyDatasetRecord(asRecord(item) ?? {});

  if (platform === "instagram" && isInstagramSonesRow(flat)) {
    return normalizeInstagramSonesPost(platform, flat, index);
  }

  if (platform === "tiktok" && isClockworksTikTokRow(flat)) {
    return normalizeTikTokPost(platform, flat, index);
  }

  return basePost(platform, flat, index);
}

export function normalizeOrganicItems(platform: OrganicPlatform, items: unknown[]): NormalizedOrganicPost[] {
  return items
    .map((item, index) => normalizeOrganicItem(platform, item, index))
    .filter((p): p is NormalizedOrganicPost => p !== null);
}
