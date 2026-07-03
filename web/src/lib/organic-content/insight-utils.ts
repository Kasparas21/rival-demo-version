function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Remove raw post IDs the model sometimes embeds in prose — cards below carry the links. */
export function stripPostIdsFromInsightText(text: string, postIds: string[] = []): string {
  let out = text;
  for (const id of postIds) {
    const trimmed = id.trim();
    if (!trimmed) continue;
    const escaped = escapeRegExp(trimmed);
    out = out.replace(new RegExp(`\\s*\\(\\s*${escaped}\\s*\\)`, "gi"), "");
    out = out.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "");
  }
  // Instagram/TikTok-style shortcodes in parentheses, e.g. (DaPHgAODEs_)
  out = out.replace(/\s*\([A-Za-z0-9_-]{10,}\)/g, "");
  return out
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .trim();
}

export function sanitizeInsightItem<T extends { summary: string; why?: string; post_ids?: string[] }>(
  item: T,
): T {
  const postIds = item.post_ids ?? [];
  return {
    ...item,
    summary: stripPostIdsFromInsightText(item.summary, postIds),
    why: item.why ? stripPostIdsFromInsightText(item.why, postIds) : item.why,
  };
}

export function insightAiSectionsEmpty(insight: {
  whats_working?: unknown;
  whats_flopping?: unknown;
} | null | undefined): boolean {
  if (!insight) return true;
  const working = Array.isArray(insight.whats_working) ? insight.whats_working : [];
  const flopping = Array.isArray(insight.whats_flopping) ? insight.whats_flopping : [];
  return working.length === 0 && flopping.length === 0;
}
