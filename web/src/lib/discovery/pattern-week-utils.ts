const DAY_MS = 86_400_000;

/** Monday 00:00 UTC for the ISO week containing `ms`. */
export function startOfUtcWeekMonday(ms: number): number {
  const d = new Date(ms);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

export function utcWeekStartYmd(ms: number): string {
  return new Date(startOfUtcWeekMonday(ms)).toISOString().slice(0, 10);
}

export function parseUtcWeekStartYmd(ymd: string): number {
  return Date.parse(`${ymd}T00:00:00.000Z`);
}

export function inUtcHalfOpenRange(ms: number, startMs: number, endMs: number): boolean {
  return ms >= startMs && ms < endMs;
}

export { DAY_MS };
