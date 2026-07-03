import { flattenApifyDatasetRecord } from "@/lib/apify/client";
import { deepFindMetaPreviewUrl } from "@/lib/ad-library/normalize";

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

function isXtdataTwitterRow(row: Record<string, unknown>): boolean {
  return typeof row.full_text === "string" && Boolean(pickString(row.id, row.url));
}

function isRetweetFullText(fullText: string): boolean {
  return fullText.trim().startsWith("RT @");
}

function pickXtdataTwitterMediaUrls(row: Record<string, unknown>): string[] {
  const urls = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === "string" && v.startsWith("http")) urls.add(v);
  };

  const extended = asRecord(row.extended_entities);
  const media = extended?.media;
  if (Array.isArray(media)) {
    for (const item of media) {
      const rec = asRecord(item);
      if (!rec) continue;
      add(rec.media_url_https);

      const videoInfo = asRecord(rec.video_info);
      const variants = videoInfo?.variants;
      if (Array.isArray(variants)) {
        let bestMp4: { url: string; bitrate: number } | null = null;
        for (const variant of variants) {
          const v = asRecord(variant);
          if (!v || v.content_type !== "video/mp4") continue;
          const url = pickString(v.url);
          const bitrate = typeof v.bitrate === "number" ? v.bitrate : 0;
          if (url && (!bestMp4 || bitrate > bestMp4.bitrate)) {
            bestMp4 = { url, bitrate };
          }
        }
        if (bestMp4) add(bestMp4.url);
      }
    }
  }

  return [...urls];
}

function findViewsByRestId(value: unknown, tweetId: string, depth = 0): number {
  if (depth > 12 || value == null || !tweetId) return 0;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findViewsByRestId(item, tweetId, depth + 1);
      if (found > 0) return found;
    }
    return 0;
  }

  const rec = asRecord(value);
  if (!rec) return 0;

  const restId = pickString(rec.rest_id, rec.id_str, rec.id);
  if (restId === tweetId) {
    const viewCountInfo = asRecord(rec.view_count_info);
    const viewsObj = asRecord(rec.views);
    const matched = pickNumber(
      viewCountInfo?.count,
      viewsObj?.count,
      rec.views,
      rec.view_count,
      rec.viewCount,
      asRecord(rec.ext_views)?.count,
      asRecord(asRecord(rec.legacy)?.ext_views)?.count,
      asRecord(rec.legacy)?.view_count,
    );
    if (matched > 0) return matched;
  }

  for (const child of Object.values(rec)) {
    const found = findViewsByRestId(child, tweetId, depth + 1);
    if (found > 0) return found;
  }

  return 0;
}

function findNestedViewCountInfoCount(value: unknown, depth = 0): number {
  if (depth > 10 || value == null) return 0;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNestedViewCountInfoCount(item, depth + 1);
      if (found > 0) return found;
    }
    return 0;
  }

  const rec = asRecord(value);
  if (!rec) return 0;

  const viewCountInfo = asRecord(rec.view_count_info);
  const fromViewCountInfo = pickNumber(viewCountInfo?.count);
  if (fromViewCountInfo > 0) return fromViewCountInfo;

  const viewsObj = asRecord(rec.views);
  const fromViewsObj = pickNumber(viewsObj?.count, rec.views);
  if (fromViewsObj > 0) return fromViewsObj;

  for (const child of Object.values(rec)) {
    const found = findNestedViewCountInfoCount(child, depth + 1);
    if (found > 0) return found;
  }

  return 0;
}

function pickXtdataTwitterViews(row: Record<string, unknown>): number {
  const tweetId = pickString(row.id, row.id_str, row.rest_id);
  const viewCountInfo = asRecord(row.view_count_info);
  const viewsObj = asRecord(row.views);
  const extViews = asRecord(row.ext_views);
  const legacy = asRecord(row.legacy);
  const result = asRecord(row.result);

  const direct = pickNumber(
    viewCountInfo?.count,
    viewsObj?.count,
    row.views,
    row.view_count,
    row.viewCount,
    row.impression_count,
    extViews?.count,
    legacy?.view_count,
    asRecord(legacy?.ext_views)?.count,
    asRecord(result?.view_count_info)?.count,
    asRecord(result?.views)?.count,
  );
  if (direct > 0) return direct;

  if (tweetId) {
    const byRestId = findViewsByRestId(row, tweetId);
    if (byRestId > 0) return byRestId;
    return 0;
  }

  return findNestedViewCountInfoCount(row);
}

/** Re-extract view count from stored xtdata raw_data (e.g. when serving API). */
export function extractTwitterViewsFromRaw(raw_data: unknown): number {
  const row = asRecord(raw_data);
  if (!row) return 0;
  return pickXtdataTwitterViews(row);
}

function pickXtdataTwitterMentions(row: Record<string, unknown>): OrganicCollaboratorAccount[] {
  const entities = asRecord(row.entities);
  const mentions = entities?.user_mentions;
  if (!Array.isArray(mentions)) return [];

  const out: OrganicCollaboratorAccount[] = [];
  for (const mention of mentions) {
    const rec = asRecord(mention);
    if (!rec) continue;
    out.push({
      handle: pickString(rec.screen_name) ?? undefined,
      username: pickString(rec.screen_name) ?? undefined,
      name: pickString(rec.name) ?? undefined,
    });
  }
  return out;
}

function normalizeXtdataTwitterPost(
  platform: OrganicPlatform,
  row: Record<string, unknown>,
  index: number,
): NormalizedOrganicPost | null {
  const fullText = pickString(row.full_text);
  if (!fullText || isRetweetFullText(fullText)) return null;

  const postId = pickString(row.id) ?? `${platform}-${index}`;

  return {
    platform,
    post_id: postId,
    content: fullText.replace(/\s+https:\/\/t\.co\/\S+$/g, "").trim() || fullText,
    posted_at: pickDate(row.created_at, row.createdAt),
    likes: pickNumber(row.favorite_count, row.favoriteCount, row.likes),
    comments: pickNumber(row.reply_count, row.replyCount, row.comments),
    shares: pickNumber(row.retweet_count, row.retweetCount, row.retweets, row.shares),
    views: pickXtdataTwitterViews(row),
    media_urls: pickXtdataTwitterMediaUrls(row),
    tagged_accounts: pickXtdataTwitterMentions(row),
    co_authors: [],
    raw_data: row,
  };
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

function isCalmBuilderYouTubeRow(row: Record<string, unknown>): boolean {
  if (row.isShort === true && pickString(row.id)) return true;
  const inputType = pickString(row.inputType);
  if (inputType === "channel" && pickString(row.id)) return true;
  return false;
}

function isApidojoYouTubeRow(row: Record<string, unknown>): boolean {
  if (isCalmBuilderYouTubeRow(row)) return false;
  const channel = asRecord(row.channel);
  return Boolean(pickString(row.id) && channel && pickString(channel.id as string | undefined));
}

function apidojoBestThumbnail(row: Record<string, unknown>): string | null {
  const thumbs = row.thumbnails;
  if (!Array.isArray(thumbs) || thumbs.length === 0) return null;
  for (let i = thumbs.length - 1; i >= 0; i -= 1) {
    const url = pickString(asRecord(thumbs[i])?.url as string | undefined);
    if (url) return url;
  }
  return null;
}

function normalizeApidojoYouTubePost(
  platform: OrganicPlatform,
  row: Record<string, unknown>,
): NormalizedOrganicPost | null {
  const postId = pickString(row.id);
  if (!postId) return null;

  const url = pickString(row.url) ?? "";
  const type = pickString(row.type);
  if (type === "short" || /youtube\.com\/shorts\//i.test(url)) return null;

  const channel = asRecord(row.channel);
  const channelId = pickString(channel?.id as string | undefined);
  const channelName = pickString(channel?.name as string | undefined);
  const channelHandle = pickString(channel?.handle as string | undefined);
  const channelUrl =
    pickString(channel?.url as string | undefined) ??
    (channelHandle ? `https://www.youtube.com/${channelHandle.replace(/^@/, "@")}` : null);
  const thumbnail = apidojoBestThumbnail(row);
  const videoUrl = url || `https://www.youtube.com/watch?v=${postId}`;

  const enrichedRaw: Record<string, unknown> = {
    ...row,
    product_type: "video",
    video_url: videoUrl,
    video_id: postId,
    channel_id: channelId,
    channel_name: channelName,
    channel_url: channelUrl,
  };

  return {
    platform,
    post_id: postId,
    content: pickString(row.title) ?? pickCaption(row),
    posted_at: pickDate(row.publishDate, row.uploadDate, row.publishedAt, row.publishedTimeText),
    likes: pickNumber(row.likes, row.likeCount),
    comments: pickNumber(row.comments, row.commentCount),
    shares: 0,
    views: pickNumber(row.views, row.viewCount),
    media_urls: thumbnail ? [thumbnail] : pickMediaUrls(row),
    tagged_accounts: [],
    co_authors: [],
    raw_data: enrichedRaw,
  };
}

function normalizeCalmBuilderYouTubePost(
  platform: OrganicPlatform,
  row: Record<string, unknown>,
): NormalizedOrganicPost | null {
  const details = asRecord(row.details);
  const postId = pickString(row.id, details?.id as string | undefined);
  if (!postId) return null;

  const url = pickString(row.url) ?? "";
  if (row.isShort !== true && !/youtube\.com\/shorts\//i.test(url)) return null;

  const author = pickString(details?.author as string | undefined);
  const channelId = pickString(details?.channelId as string | undefined);
  const videoUrl = url || `https://www.youtube.com/shorts/${postId}`;
  const channelUrl = author ? `https://www.youtube.com/@${author.replace(/^@/, "")}` : null;
  const thumbnail = pickString(row.thumbnailUrl, details?.thumbnailUrl as string | undefined);

  const enrichedRaw: Record<string, unknown> = {
    ...row,
    product_type: "short",
    video_url: videoUrl,
    video_id: postId,
    channel_id: channelId,
    channel_name: author,
    channel_url: channelUrl,
  };

  return {
    platform,
    post_id: postId,
    content: pickString(row.title, details?.title as string | undefined) ?? pickCaption(row),
    posted_at: pickDate(
      row.publishedDate,
      details?.publishDate,
      details?.uploadDate,
      row.publishedTimeText,
    ),
    likes: pickNumber(row.likeCount, details?.likeCount),
    comments: pickNumber(row.commentCount, details?.commentCount),
    shares: 0,
    views: pickNumber(row.viewCount, details?.viewCount),
    media_urls: thumbnail ? [thumbnail] : pickMediaUrls(row),
    tagged_accounts: [],
    co_authors: [],
    raw_data: enrichedRaw,
  };
}

function isScrapesmithYouTubeRow(row: Record<string, unknown>): boolean {
  return Boolean(pickString(row.video_id) && pickString(row.video_url));
}

function isYouTubeShortRow(row: Record<string, unknown>): boolean {
  const videoUrl = pickString(row.video_url) ?? "";
  if (/youtube\.com\/shorts\//i.test(videoUrl)) return true;
  return pickString(row.product_type, row.productType) === "short";
}

function normalizeScrapesmithYouTubePost(
  platform: OrganicPlatform,
  row: Record<string, unknown>,
): NormalizedOrganicPost | null {
  const postId = pickString(row.video_id);
  if (!postId) return null;

  const productType = isYouTubeShortRow(row) ? "short" : "video";
  const thumbnail = pickString(row.thumbnail);
  const mediaUrls = thumbnail ? [thumbnail] : pickMediaUrls(row);

  return {
    platform,
    post_id: postId,
    content: pickString(row.title) ?? pickCaption(row),
    posted_at: pickDate(row.date_posted, row.publishedAt, row.posted_at, row.postedAt),
    likes: pickNumber(row.likes, row.likeCount, row.like_count),
    comments: pickNumber(row.comments, row.commentsCount, row.comment_count),
    shares: 0,
    views: pickNumber(row.views, row.viewCount, row.view_count),
    media_urls: mediaUrls,
    tagged_accounts: [],
    co_authors: [],
    raw_data: { ...row, product_type: productType },
  };
}

function isFacebookContentPageUrl(url: string): boolean {
  return /facebook\.com\/(reel|watch|video|photo|posts|permalink|videos)\//i.test(url);
}

function isApifyFacebookPostRow(row: Record<string, unknown>): boolean {
  if (pickString(row.pageName, row.postId) && pickString(row.text, row.message)) return true;
  if (!Array.isArray(row.media) || row.media.length === 0) return false;
  const first = asRecord(row.media[0]);
  return Boolean(
    first &&
      (pickString(first.thumbnail) ||
        pickString(asRecord(first.thumbnailImage)?.uri as string | undefined) ||
        pickString(asRecord(first.image)?.uri as string | undefined) ||
        first.videoId != null),
  );
}

function pickFacebookMediaUrls(row: Record<string, unknown>): string[] {
  const urls = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v !== "string" || !v.startsWith("http") || isFacebookContentPageUrl(v)) return;
    urls.add(v);
  };

  add(row.fullPicture);
  add(row.full_picture);
  add(row.picture);

  const media = row.media;
  if (Array.isArray(media)) {
    for (const item of media) {
      const rec = asRecord(item);
      if (!rec) continue;
      add(rec.thumbnail);
      add(asRecord(rec.thumbnailImage)?.uri);
      add(asRecord(rec.image)?.uri);
      add(asRecord(asRecord(rec.preferred_thumbnail)?.image)?.uri);
    }
  }

  const deep = deepFindMetaPreviewUrl(row);
  if (deep && !isFacebookContentPageUrl(deep)) urls.add(deep);

  return [...urls];
}

/** Re-extract preview URLs from stored Apify Facebook raw_data (e.g. when serving API). */
export function extractFacebookMediaFromRaw(raw_data: unknown): string[] {
  const row = asRecord(raw_data);
  if (!row) return [];
  return pickFacebookMediaUrls(row);
}

function isFacebookReelRow(row: Record<string, unknown>): boolean {
  const url = pickString(row.url, row.postUrl, row.post_url) ?? "";
  if (/facebook\.com\/reel\//i.test(url)) return true;

  const media = row.media;
  if (!Array.isArray(media)) return false;
  for (const item of media) {
    const rec = asRecord(item);
    if (!rec) continue;
    const mediaUrl = pickString(rec.url, rec.permalink_url);
    if (mediaUrl && /facebook\.com\/reel\//i.test(mediaUrl)) return true;
    const width = typeof rec.width === "number" ? rec.width : null;
    const height = typeof rec.height === "number" ? rec.height : null;
    if (rec.__typename === "Video" && height && width && height > width) return true;
  }
  return false;
}

function normalizeFacebookPost(
  platform: OrganicPlatform,
  row: Record<string, unknown>,
  index: number,
): NormalizedOrganicPost | null {
  const postId = pickString(row.postId, row.post_id, row.id) ?? `${platform}-${index}`;
  const mediaUrls = pickFacebookMediaUrls(row);
  const isReel = isFacebookReelRow(row);
  const productType = isReel ? "reel" : mediaUrls.length > 0 ? "photo" : null;
  const postUrl =
    pickString(row.url, row.postUrl, row.post_url, row.link) ??
    (Array.isArray(row.media)
      ? pickString(asRecord(row.media[0])?.permalink_url as string | undefined)
      : null);

  const enrichedRaw: Record<string, unknown> = {
    ...row,
    ...(productType ? { product_type: productType } : {}),
    ...(postUrl ? { post_url: postUrl } : {}),
  };

  return {
    platform,
    post_id: postId,
    content: pickCaption(row),
    posted_at: pickDate(row.time, row.timestamp, row.postedAt, row.posted_at, row.createdAt),
    likes: pickNumber(row.likes, row.likeCount, row.reactions, row.reactionCount),
    comments: pickNumber(row.comments, row.commentCount, row.numComments),
    shares: pickNumber(row.shares, row.shareCount, row.numShares),
    views: pickNumber(row.views, row.viewCount, row.videoViewCount),
    media_urls: mediaUrls,
    tagged_accounts: pickTaggedAccounts(row),
    co_authors: pickCoAuthors(row),
    raw_data: enrichedRaw,
  };
}

function isHarvestapiLinkedInPostRow(row: Record<string, unknown>): boolean {
  const type = pickString(row.type);
  if (type && type !== "post") return false;
  return Boolean(pickString(row.linkedinUrl) && pickString(row.id));
}

function pickHarvestapiLinkedInMediaUrls(row: Record<string, unknown>): string[] {
  const urls = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === "string" && v.startsWith("http")) urls.add(v);
  };

  const postImages = row.postImages;
  if (Array.isArray(postImages)) {
    for (const item of postImages) {
      add(item);
      const rec = asRecord(item);
      add(rec?.url);
      add(rec?.imageUrl);
    }
  }

  const document = asRecord(row.document);
  const coverPages = document?.coverPages;
  if (Array.isArray(coverPages)) {
    for (const page of coverPages) {
      const rec = asRecord(page);
      const imageUrls = rec?.imageUrls;
      if (Array.isArray(imageUrls)) {
        for (const url of imageUrls) add(url);
      }
    }
  }

  const postVideo = asRecord(row.postVideo);
  if (postVideo) {
    add(postVideo.thumbnailUrl);
    add(asRecord(postVideo.thumbnail)?.url);
  }

  for (const url of pickMediaUrls(row)) {
    if (/media\.licdn\.com/i.test(url)) urls.add(url);
  }

  return [...urls];
}

/** Re-extract preview URLs from stored harvestapi LinkedIn raw_data. */
export function extractLinkedInMediaFromRaw(raw_data: unknown): string[] {
  const row = asRecord(raw_data);
  if (!row) return [];
  if (isHarvestapiLinkedInPostRow(row)) return pickHarvestapiLinkedInMediaUrls(row);
  return pickMediaUrls(row).filter((url) => /media\.licdn\.com/i.test(url));
}

function normalizeHarvestapiLinkedInPost(
  platform: OrganicPlatform,
  row: Record<string, unknown>,
): NormalizedOrganicPost | null {
  const postId = pickString(row.id);
  if (!postId) return null;

  const engagement = asRecord(row.engagement);
  const postedAt = asRecord(row.postedAt);
  const author = asRecord(row.author);
  const avatar = asRecord(author?.avatar);
  const mediaUrls = pickHarvestapiLinkedInMediaUrls(row);
  const postUrl = pickString(row.linkedinUrl);
  const productType = mediaUrls.length > 0 ? (asRecord(row.postVideo) ? "video" : "photo") : null;

  const enrichedRaw: Record<string, unknown> = {
    ...row,
    ...(productType ? { product_type: productType } : {}),
    ...(postUrl ? { post_url: postUrl } : {}),
    author_name: pickString(author?.name),
    author_username: pickString(author?.universalName, author?.publicIdentifier),
    author_avatar_url: pickString(avatar?.url),
  };

  return {
    platform,
    post_id: postId,
    content: pickString(row.content) ?? pickCaption(row),
    posted_at: pickDate(
      postedAt?.date,
      postedAt?.timestamp,
      row.postedAt,
      row.createdAt,
      row.time,
    ),
    likes: pickNumber(engagement?.likes, row.likes, row.numLikes),
    comments: pickNumber(engagement?.comments, row.comments, row.numComments),
    shares: pickNumber(engagement?.shares, row.shares, row.numShares),
    views: pickNumber(row.views, row.viewCount),
    media_urls: mediaUrls,
    tagged_accounts: pickTaggedAccounts(row),
    co_authors: pickCoAuthors(row),
    raw_data: enrichedRaw,
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

  if (platform === "twitter" && isXtdataTwitterRow(flat)) {
    return normalizeXtdataTwitterPost(platform, flat, index);
  }

  if (platform === "youtube" && isCalmBuilderYouTubeRow(flat)) {
    return normalizeCalmBuilderYouTubePost(platform, flat);
  }

  if (platform === "youtube" && isApidojoYouTubeRow(flat)) {
    return normalizeApidojoYouTubePost(platform, flat);
  }

  if (platform === "youtube" && isScrapesmithYouTubeRow(flat)) {
    return normalizeScrapesmithYouTubePost(platform, flat);
  }

  if (platform === "facebook" && isApifyFacebookPostRow(flat)) {
    return normalizeFacebookPost(platform, flat, index);
  }

  if (platform === "linkedin" && isHarvestapiLinkedInPostRow(flat)) {
    return normalizeHarvestapiLinkedInPost(platform, flat);
  }

  return basePost(platform, flat, index);
}

export function normalizeOrganicItems(platform: OrganicPlatform, items: unknown[]): NormalizedOrganicPost[] {
  return items
    .map((item, index) => normalizeOrganicItem(platform, item, index))
    .filter((p): p is NormalizedOrganicPost => p !== null);
}
