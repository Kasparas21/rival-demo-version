import { limitsForTier } from "@/lib/billing/plan-limits";

const SESSION_KEY = "rival:max-watched-competitors";

/** Pro tier max — safe fallback before `/api/account/usage` resolves. */
const DEFAULT_MAX_WATCHED_COMPETITORS = limitsForTier("pro").maxWatchedCompetitors;

export const CLIENT_PLAN_CAP_EVENT = "rival-plan-cap";

export function setClientMaxWatchedCompetitors(limit: number): void {
  if (typeof window === "undefined") return;
  if (!Number.isFinite(limit) || limit < 1) return;
  try {
    sessionStorage.setItem(SESSION_KEY, String(Math.floor(limit)));
    window.dispatchEvent(new Event(CLIENT_PLAN_CAP_EVENT));
  } catch {
    /* ignore */
  }
}

export function readClientMaxWatchedCompetitors(
  fallback: number = DEFAULT_MAX_WATCHED_COMPETITORS,
): number {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return fallback;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

export async function syncClientMaxWatchedCompetitorsFromUsage(): Promise<number> {
  try {
    const res = await fetch("/api/account/usage", { cache: "no-store", credentials: "include" });
    if (!res.ok) return readClientMaxWatchedCompetitors();
    const data = (await res.json()) as {
      usage?: { limits?: { maxWatchedCompetitors?: number } };
      billing?: { limits?: { maxWatchedCompetitors?: number } };
    };
    const limit =
      data.usage?.limits?.maxWatchedCompetitors ?? data.billing?.limits?.maxWatchedCompetitors;
    if (typeof limit === "number" && limit > 0) {
      setClientMaxWatchedCompetitors(limit);
      return limit;
    }
  } catch {
    /* ignore */
  }
  return readClientMaxWatchedCompetitors();
}
