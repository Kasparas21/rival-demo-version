/** Shared Detail-tab formatters — run start (medium date) and impressions compaction. */

const MEDIUM: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};

export function formatDetailMediumDateUtcMs(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", MEDIUM);
}

function parseSlashMmDdYyyyToUtcMs(s: string): number | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const month = Number(m[1]) - 1;
  const day = Number(m[2]);
  const year = Number(m[3]);
  const t = Date.UTC(year, month, day);
  return Number.isNaN(t) ? null : t;
}

/** Best-effort parse to UTC midnight-ish for calendar-day deltas / display. */
export function parseLooseDateStringToUtcMs(s: string | null | undefined): number | null {
  if (!s?.trim()) return null;
  const t = s.trim();

  const ymdPrefix = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (ymdPrefix) {
    const y = Number(ymdPrefix[1]);
    const mo = Number(ymdPrefix[2]) - 1;
    const d = Number(ymdPrefix[3]);
    const ms = Date.UTC(y, mo, d);
    return Number.isNaN(ms) ? null : ms;
  }

  const slash = parseSlashMmDdYyyyToUtcMs(t);
  if (slash != null) return slash;

  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatRunStartLabelFromUtcMs(ms: number | null | undefined): string | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  const out = formatDetailMediumDateUtcMs(ms);
  return out.trim() ? out : null;
}

/** Format any scraper-produced date string toward `Nov 17, 2025` when parseable; else null. */
export function formatRunStartLabelFromDateString(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const ms = parseLooseDateStringToUtcMs(raw);
  return ms != null ? formatRunStartLabelFromUtcMs(ms) : null;
}

function compactThousands(n: number): string {
  if (!Number.isFinite(n)) return "";
  const abs = Math.abs(Math.round(n));
  return abs.toLocaleString("en-US");
}

/** Shorten counts for band labels: `10000` → `10k` (preserve existing `k`/`K` in source when already abbreviated). */
function compactNumberPart(nStr: string): string {
  const cleaned = nStr.replace(/,/g, "").trim();
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 1000 || /[kKmM]/i.test(nStr)) return nStr;
  if (n % 1000 !== 0) return compactThousands(n).replace(/,/g, "");
  return `${Math.round(n / 1000)}k`;
}

/**
 * Readable impressions/reach bands: commas for exact ints, shorten wide ranges (`0 – 10k`).
 * Does not aggressively rewrite legitimate `400K–500K` style strings beyond spacing.
 */
export function formatImpressionsDetailLabel(raw: string): string {
  const t = raw.trim();
  if (!t) return t;

  // Hyphen/en-dash-separated numeric range (possibly with commas)
  const band = /^([\d,.\s]*\d[\d,.\s]*)\s*[–\-]\s*([\d,.\s]*\d[\d,.\s]*)$/.exec(t.replace(/\u2013/g, "–"));
  if (band) {
    const left = compactNumberPart(band[1].trim());
    const right = compactNumberPart(band[2].trim());
    return `${left} – ${right}`;
  }

  const asNum = Number(t.replace(/,/g, ""));
  if (/^\d+$/.test(t.replace(/,/g, "").trim())) {
    return compactThousands(asNum);
  }

  return t;
}

export function mergeReachAndImpressionsLine(a: string | null | undefined, b: string | null | undefined): string | null {
  const aa = typeof a === "string" ? a.trim() : "";
  const bb = typeof b === "string" ? b.trim() : "";
  if (aa && bb && aa !== bb) {
    return `${formatImpressionsDetailLabel(aa)} · ${formatImpressionsDetailLabel(bb)}`;
  }
  if (aa) return formatImpressionsDetailLabel(aa);
  if (bb) return formatImpressionsDetailLabel(bb);
  return null;
}
