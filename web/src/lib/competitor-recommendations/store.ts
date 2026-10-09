import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import type { Recommendation, RecommendationRun } from "@/lib/competitor-recommendations/types";

/** A finished run is reused this long before a new visit may run it again. */
export const RESULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** A run still "running" after this died with its function; it may be claimed again. */
export const STALE_RUN_MS = 10 * 60 * 1000;

type Row = {
  domain: string;
  status: "running" | "done" | "failed";
  result: Json | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
};

/** What the app shows: the run without its cost, rejected list, or the model's internal notes. */
export type RecommendationsView = {
  status: "none" | "running" | "done" | "failed";
  domain: string;
  startedAt: string | null;
  finishedAt: string | null;
  profile: { brandName: string; category: string; businessType: string; city: string | null; country: string | null } | null;
  recommendations: Omit<Recommendation, "hint" | "rejectReason" | "isDirect" | "score">[];
  /** How many candidate sites were read and judged. */
  checked: number;
};

export function emptyView(domain: string): RecommendationsView {
  return { status: "none", domain, startedAt: null, finishedAt: null, profile: null, recommendations: [], checked: 0 };
}

/** The app's view of a stored row. Pure. */
export function viewOf(row: Row | null, domain: string, now = Date.now()): RecommendationsView {
  if (!row) return emptyView(domain);
  const stale = row.status === "running" && now - Date.parse(row.started_at) > STALE_RUN_MS;
  const base = { ...emptyView(domain), startedAt: row.started_at, finishedAt: row.finished_at };
  if (stale) return { ...base, status: "failed" };
  if (row.status !== "done") return { ...base, status: row.status };
  const run = row.result as unknown as RecommendationRun | null;
  if (!run) return { ...base, status: "failed" };
  return {
    ...base,
    status: "done",
    profile: {
      brandName: run.profile.brandName,
      category: run.profile.category,
      businessType: run.profile.businessType,
      city: run.profile.city,
      country: run.profile.country,
    },
    recommendations: run.recommendations.map(({ hint: _h, rejectReason: _r, isDirect: _d, score: _s, ...rest }) => rest),
    checked: run.recommendations.length + run.rejected.length,
  };
}

/** Whether a stored row should be (re)run: none yet, failed, died mid-run, or out of date. Pure. */
export function needsRun(row: Row | null, now = Date.now()): boolean {
  if (!row) return true;
  if (row.status === "failed") return true;
  if (row.status === "running") return now - Date.parse(row.started_at) > STALE_RUN_MS;
  return !row.finished_at || now - Date.parse(row.finished_at) > RESULT_TTL_MS;
}

export async function readRecommendations(domain: string): Promise<Row | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("competitor_recommendations")
    .select("domain, status, result, error, started_at, finished_at")
    .eq("domain", domain)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Mark the domain as running, unless another request just did. True when this request owns the run.
 * The update matches on the start time it read, so two concurrent claims can't both win.
 */
export async function claimRun(domain: string, userId: string | null, current: Row | null): Promise<boolean> {
  const db = createSupabaseAdminClient();
  const fresh = {
    status: "running" as const,
    result: null,
    error: null,
    cost_usd: null,
    requested_by: userId,
    started_at: new Date().toISOString(),
    finished_at: null,
  };
  if (!current) {
    const { error } = await db.from("competitor_recommendations").insert({ domain, ...fresh });
    if (!error) return true;
    if (error.code === "23505") return false; // someone else inserted it first
    throw new Error(error.message);
  }
  const { data, error } = await db
    .from("competitor_recommendations")
    .update(fresh)
    .eq("domain", domain)
    .eq("started_at", current.started_at)
    .select("domain");
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

export async function saveRun(domain: string, run: RecommendationRun): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from("competitor_recommendations")
    .update({
      status: "done",
      result: run as unknown as Json,
      cost_usd: run.costUsd,
      finished_at: new Date().toISOString(),
    })
    .eq("domain", domain);
  if (error) throw new Error(error.message);
}

export async function saveFailure(domain: string, message: string): Promise<void> {
  await createSupabaseAdminClient()
    .from("competitor_recommendations")
    .update({ status: "failed", error: message.slice(0, 500), finished_at: new Date().toISOString() })
    .eq("domain", domain);
}
