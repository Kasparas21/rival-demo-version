import { limitsForTier, type PlanTier } from "@/lib/billing/plan-limits";

const SESSION_KEY = "rival:max-watched-competitors";
const SLOTS_USED_KEY = "rival:competitors-slots-used";
const SLOTS_REMAINING_KEY = "rival:competitors-slots-remaining";

/** Workspace trial cap — conservative fallback before `/api/account/usage` resolves. */
const DEFAULT_MAX_WATCHED_COMPETITORS = limitsForTier("free_trial").maxWatchedCompetitors;

export const CLIENT_PLAN_CAP_EVENT = "rival-plan-cap";

export function setClientCompetitorSlotUsage(used: number, remaining: number): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SLOTS_USED_KEY, String(Math.max(0, Math.floor(used))));
    sessionStorage.setItem(SLOTS_REMAINING_KEY, String(Math.max(0, Math.floor(remaining))));
    window.dispatchEvent(new Event(CLIENT_PLAN_CAP_EVENT));
  } catch {
    /* ignore */
  }
}

/** `null` when usage has not been synced this session — callers fall back to local sidebar counts. */
export function readClientCompetitorSlotsRemaining(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SLOTS_REMAINING_KEY);
    if (raw == null || raw === "") return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function readClientGlobalCompetitorsUsed(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SLOTS_USED_KEY);
    if (raw == null || raw === "") return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function clearClientCompetitorSlotUsage(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SLOTS_USED_KEY);
    sessionStorage.removeItem(SLOTS_REMAINING_KEY);
  } catch {
    /* ignore */
  }
}

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
      usage?: {
        limits?: { maxWatchedCompetitors?: number; maxOwnBrandWorkspaces?: number };
        competitorsWatched?: number;
        remaining?: { competitorsWatched?: number };
      };
      billing?: {
        limits?: { maxWatchedCompetitors?: number; maxOwnBrandWorkspaces?: number };
        planTier?: string;
      };
    };
    const limit =
      data.usage?.limits?.maxWatchedCompetitors ?? data.billing?.limits?.maxWatchedCompetitors;
    if (typeof limit === "number" && limit > 0) {
      setClientMaxWatchedCompetitors(limit);
    }
    const used = data.usage?.competitorsWatched;
    const remaining = data.usage?.remaining?.competitorsWatched;
    if (typeof used === "number" && typeof remaining === "number") {
      setClientCompetitorSlotUsage(used, remaining);
    }
    return readClientMaxWatchedCompetitors();
  } catch {
    /* ignore */
  }
  return readClientMaxWatchedCompetitors();
}

export type DashboardBillingSnapshot = {
  planTier: PlanTier;
  maxOwnBrandWorkspaces: number;
  competitorsWatched: number;
  competitorsRemaining: number;
  maxWatchedCompetitors: number;
};

/** Full billing snapshot for dashboard shell (brand limits + global competitor slots). */
export async function fetchDashboardBillingSnapshot(): Promise<DashboardBillingSnapshot | null> {
  try {
    const res = await fetch("/api/account/usage", { cache: "no-store", credentials: "include" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      usage?: {
        limits?: { maxWatchedCompetitors?: number; maxOwnBrandWorkspaces?: number };
        competitorsWatched?: number;
        remaining?: { competitorsWatched?: number };
      };
      billing?: {
        planTier?: string;
        limits?: { maxWatchedCompetitors?: number; maxOwnBrandWorkspaces?: number };
      };
    };
    const limits = data.billing?.limits ?? data.usage?.limits;
    const tierRaw = data.billing?.planTier;
    const planTier: PlanTier =
      tierRaw === "starter" || tierRaw === "pro" || tierRaw === "admin" || tierRaw === "free_trial"
        ? tierRaw
        : "free_trial";
    const maxWatched =
      typeof limits?.maxWatchedCompetitors === "number" && limits.maxWatchedCompetitors > 0
        ? limits.maxWatchedCompetitors
        : limitsForTier(planTier).maxWatchedCompetitors;
    const maxBrands =
      typeof limits?.maxOwnBrandWorkspaces === "number" && limits.maxOwnBrandWorkspaces >= 1
        ? limits.maxOwnBrandWorkspaces
        : limitsForTier(planTier).maxOwnBrandWorkspaces;
    const used = typeof data.usage?.competitorsWatched === "number" ? data.usage.competitorsWatched : 0;
    const remaining =
      typeof data.usage?.remaining?.competitorsWatched === "number"
        ? data.usage.remaining.competitorsWatched
        : Math.max(0, maxWatched - used);
    setClientMaxWatchedCompetitors(maxWatched);
    setClientCompetitorSlotUsage(used, remaining);
    return {
      planTier,
      maxOwnBrandWorkspaces: maxBrands,
      competitorsWatched: used,
      competitorsRemaining: remaining,
      maxWatchedCompetitors: maxWatched,
    };
  } catch {
    return null;
  }
}
