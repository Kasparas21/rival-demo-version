/**
 * Google Transparency rows often carry no ad copy: when the scrape has no headline or description,
 * `googleItemToRow` writes `"<Advertiser> — <domain>"`, the format label and the shown dates instead.
 * This strips that scaffolding so only real copy is left (often nothing).
 */

const FORMAT_LABELS = new Set([
  "search / text",
  "image",
  "video",
  "shopping",
  "app",
  "discovery",
  "performance max",
  "display",
]);

const ADVERTISER_DOMAIN_LINE = /^.+ — [a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i;
const SHOWN_SEGMENT = /^shown\s+\S+\s*(?:→|->)\s*\S+$/i;
const UPDATED_SEGMENT = /^updated\s+\d{4}-\d{2}-\d{2}$/i;
const DATE_RANGE_LINE = /^(?:\d{4}-\d{2}-\d{2}|…|\?)\s*[–-]\s*(?:\d{4}-\d{2}-\d{2}|…|\?)$/;
const PLACEHOLDER_SEGMENT = /^(?:open in google ads transparency center for the full creative\.?|video ad(?: \(.+\))?|creative \S+|advertiser \S+|google transparency ad|—)$/i;
const BARE_DOMAIN = /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i;

function isScaffolding(segment: string): boolean {
  const s = segment.trim();
  return (
    !s ||
    FORMAT_LABELS.has(s.toLowerCase()) ||
    ADVERTISER_DOMAIN_LINE.test(s) ||
    SHOWN_SEGMENT.test(s) ||
    UPDATED_SEGMENT.test(s) ||
    DATE_RANGE_LINE.test(s) ||
    PLACEHOLDER_SEGMENT.test(s) ||
    BARE_DOMAIN.test(s)
  );
}

/** The real copy in a Google/YouTube `ad_text`, with generated scaffolding removed (may be ""). */
export function googleAdCopy(adText: string | null | undefined): string {
  const lines = (adText ?? "").split(/\n+/);
  /** The scaffolding also repeats the advertiser name on its own (e.g. a trailing "Allbirds Inc"). */
  const firstLine = lines.find((l) => l.trim())?.trim() ?? "";
  const advertiser = ADVERTISER_DOMAIN_LINE.test(firstLine) ? firstLine.split(" — ")[0]!.trim().toLowerCase() : null;
  const kept: string[] = [];
  for (const line of lines) {
    const parts = line
      .split(" · ")
      .map((p) => p.trim())
      .filter((p) => !isScaffolding(p) && p.toLowerCase() !== advertiser);
    const joined = parts.join(" · ");
    if (joined && !kept.includes(joined)) kept.push(joined);
  }
  return kept.join("\n");
}
