import { truncateAdCopy } from "@/lib/mcp/truncate";

export function formatAdCopyForMcp(
  text: string,
  includeFullCopy?: boolean,
): { ad_text: string; truncated: boolean } {
  if (includeFullCopy) {
    const t = text.trim();
    return { ad_text: t, truncated: false };
  }
  const copy = truncateAdCopy(text);
  return { ad_text: copy.text, truncated: copy.truncated };
}
