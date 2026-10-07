/**
 * Instagram returns `like_count: 3` for posts whose owner hides like counts; there is no flag for it.
 * Stored as a real number it made "3 likes" the typical Rothy's post (25 of 30) next to 33K plays, and the
 * AI insight quoted it. Treat it as unknown when it is clearly a placeholder.
 */
export const INSTAGRAM_HIDDEN_LIKES_PLACEHOLDER = 3;

/** Several posts at exactly the placeholder means the account hides likes. */
const REPEATED_PLACEHOLDER_MIN = 3;

type LikeRow = {
  platform: string;
  likes: number | null;
  comments?: number | null;
  views?: number | null;
};

/** Whether this set of posts repeats Instagram's hidden-likes placeholder (pass it to {@link knownLikes}). */
export function repeatsHiddenLikesPlaceholder(posts: LikeRow[]): boolean {
  let n = 0;
  for (const p of posts) {
    if (p.platform.trim().toLowerCase() === "instagram" && p.likes === INSTAGRAM_HIDDEN_LIKES_PLACEHOLDER) n += 1;
  }
  return n >= REPEATED_PLACEHOLDER_MIN;
}

/**
 * The post's like count, or null when likes are hidden. A placeholder is recognised when the account repeats
 * it, or when the post has more comments than likes or hundreds of views — real 3-like posts don't.
 */
export function knownLikes(post: LikeRow, placeholderRepeated: boolean): number | null {
  if (post.likes == null) return null;
  if (post.platform.trim().toLowerCase() !== "instagram" || post.likes !== INSTAGRAM_HIDDEN_LIKES_PLACEHOLDER) {
    return post.likes;
  }
  const hidden = placeholderRepeated || (post.comments ?? 0) > post.likes || (post.views ?? 0) >= 300;
  return hidden ? null : post.likes;
}
