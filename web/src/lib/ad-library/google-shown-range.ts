/** Parse Transparency date spans from scraper/card `shownSummary` text. */

const DATE_PAIR_CAPTURE = String.raw`\b(\d{4}-\d{2}-\d{2})\s*(?:->|→|—|–|-)\s*(\d{4}-\d{2}-\d{2})\b`;

/**
 * Parses values like `Shown 2025-11-25 -> 2026-05-16` (Google UI wording) or bare
 * `2024-05-01 – 2026-05-15` (see `normalize` `shownSummary`: two ISO dates, en dash).
 */
export function parseGoogleShownSummaryRange(summary: string | null | undefined): {
  first?: string;
  last?: string;
} {
  if (!summary?.trim()) return {};

  const t = summary.trim();
  const withShown = /^Shown\s+/i.exec(t)
    ? t.match(/^Shown\s+(\d{4}-\d{2}-\d{2})\s*(?:->|→|—|–|-)\s*(\d{4}-\d{2}-\d{2})/i)
    : null;
  if (withShown) return { first: withShown[1], last: withShown[2] };

  const bare = new RegExp(DATE_PAIR_CAPTURE).exec(t);
  if (bare) return { first: bare[1], last: bare[2] };

  return {};
}
