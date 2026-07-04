export function truncateAdCopy(text: string, max = 300): { text: string; truncated: boolean } {
  const t = text.trim();
  if (t.length <= max) return { text: t, truncated: false };
  return { text: `${t.slice(0, max)}…`, truncated: true };
}

export function lifespanDays(firstSeen: string, lastSeen: string): number {
  const a = Date.parse(firstSeen);
  const b = Date.parse(lastSeen);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}
