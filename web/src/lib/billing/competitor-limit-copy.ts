/** User-facing copy when a plan's watched-competitor cap is reached. */
export function competitorWatchLimitReachedMessage(limit: number): string {
  const n = Math.max(1, Math.floor(limit));
  if (n === 1) {
    return "You've added 1 competitor — you've reached your limit.";
  }
  return `You've added ${n} competitors — you've reached your limit.`;
}
