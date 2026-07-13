import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/types";
import { limitsForTier, type PlanLimits } from "@/lib/billing/plan-limits";

export type CustomQuoteStatus = "draft" | "sent" | "accepted" | "expired" | "revoked";
export type CustomBillingPeriod = "monthly" | "annual";

export type CustomQuoteRow = {
  id: string;
  user_id: string;
  status: CustomQuoteStatus;
  price_cents: number;
  currency: string;
  billing_period: CustomBillingPeriod;
  trial_days: number;
  limits: Json;
  polar_product_id: string | null;
  checkout_token: string;
  internal_notes: string | null;
  sales_notes: string | null;
  created_by: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  expires_at: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export function parsePlanLimitsFromJson(value: Json | null | undefined): PlanLimits | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  const defaults = limitsForTier("pro");
  const num = (key: keyof PlanLimits, fallback: number) => {
    const v = o[key as string];
    return typeof v === "number" && Number.isFinite(v) ? v : fallback;
  };
  const numOrNull = (key: keyof PlanLimits, fallback: number | null) => {
    const v = o[key as string];
    if (v === null) return null;
    return typeof v === "number" && Number.isFinite(v) ? v : fallback;
  };
  const bool = (key: keyof PlanLimits, fallback: boolean) => {
    const v = o[key as string];
    return typeof v === "boolean" ? v : fallback;
  };

  return {
    maxWatchedCompetitors: num("maxWatchedCompetitors", defaults.maxWatchedCompetitors),
    maxOwnBrandWorkspaces: num("maxOwnBrandWorkspaces", defaults.maxOwnBrandWorkspaces),
    maxAdsProcessedPerMonth: num("maxAdsProcessedPerMonth", defaults.maxAdsProcessedPerMonth),
    maxTotalScrapeOperations: numOrNull("maxTotalScrapeOperations", defaults.maxTotalScrapeOperations),
    maxSwapsPerMonth: num("maxSwapsPerMonth", defaults.maxSwapsPerMonth),
    csvExportsPerMonth: num("csvExportsPerMonth", defaults.csvExportsPerMonth),
    csvMaxAdsPerExport: num("csvMaxAdsPerExport", defaults.csvMaxAdsPerExport),
    manualRefreshPerMonth: num("manualRefreshPerMonth", defaults.manualRefreshPerMonth),
    manualRefreshMinIntervalMs: num("manualRefreshMinIntervalMs", defaults.manualRefreshMinIntervalMs),
    manualRefreshAdsPerPlatform: num("manualRefreshAdsPerPlatform", defaults.manualRefreshAdsPerPlatform),
    canDisableSmartPrioritization: bool("canDisableSmartPrioritization", defaults.canDisableSmartPrioritization),
    allowCsvExport: bool("allowCsvExport", defaults.allowCsvExport),
    allowManualRefresh: bool("allowManualRefresh", defaults.allowManualRefresh),
    allowAutoRefresh: bool("allowAutoRefresh", defaults.allowAutoRefresh),
    allowAlertRules: bool("allowAlertRules", defaults.allowAlertRules),
    allowAlertEmail: bool("allowAlertEmail", defaults.allowAlertEmail),
    maxAiStrategyOverviews: numOrNull("maxAiStrategyOverviews", defaults.maxAiStrategyOverviews),
    maxAdPreviewAnalysesPerMonth: numOrNull("maxAdPreviewAnalysesPerMonth", defaults.maxAdPreviewAnalysesPerMonth),
    allowEmailMarketing: bool("allowEmailMarketing", defaults.allowEmailMarketing),
    maxEmailTrackers: numOrNull("maxEmailTrackers", defaults.maxEmailTrackers),
    maxEmailAiAnalysesPerMonth: numOrNull("maxEmailAiAnalysesPerMonth", defaults.maxEmailAiAnalysesPerMonth),
    initialScrapeAdsPerPlatform: numOrNull("initialScrapeAdsPerPlatform", defaults.initialScrapeAdsPerPlatform),
  };
}

export function planLimitsToJson(limits: PlanLimits): Json {
  return JSON.parse(JSON.stringify(limits)) as Json;
}

export function defaultCustomQuoteLimits(): PlanLimits {
  return limitsForTier("pro");
}

export function isQuoteExpired(quote: Pick<CustomQuoteRow, "expires_at" | "status">): boolean {
  if (quote.status === "expired" || quote.status === "revoked") return true;
  if (!quote.expires_at) return false;
  return Date.parse(quote.expires_at) < Date.now();
}

export async function getActiveCustomQuoteForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CustomQuoteRow | null> {
  try {
    const { data, error } = await supabase
      .from("custom_quotes")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "accepted")
      .order("accepted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return (data as CustomQuoteRow | null) ?? null;
  } catch {
    return null;
  }
}

export async function getSentCustomQuoteForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CustomQuoteRow | null> {
  try {
    const { data, error } = await supabase
      .from("custom_quotes")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    const quote = data as CustomQuoteRow | null;
    if (!quote) return null;
    if (isQuoteExpired(quote)) return null;
    return quote;
  } catch {
    return null;
  }
}

export async function getCustomQuoteByToken(
  supabase: SupabaseClient<Database>,
  token: string,
): Promise<CustomQuoteRow | null> {
  const { data } = await supabase
    .from("custom_quotes")
    .select("*")
    .eq("checkout_token", token.trim())
    .maybeSingle();

  const quote = data as CustomQuoteRow | null;
  if (!quote) return null;
  if (quote.status !== "sent") return null;
  if (isQuoteExpired(quote)) return null;
  return quote;
}

export function isComplimentaryQuote(quote: Pick<CustomQuoteRow, "price_cents">): boolean {
  return Number(quote.price_cents) === 0;
}

export async function markCustomQuoteAccepted(
  admin: SupabaseClient<Database>,
  quoteId: string,
): Promise<string | null> {
  const now = new Date().toISOString();
  const { error } = await admin
    .from("custom_quotes")
    .update({ status: "accepted", accepted_at: now, updated_at: now })
    .eq("id", quoteId)
    .in("status", ["sent", "draft"]);

  return error?.message ?? null;
}

export function formatQuotePrice(priceCents: number, currency: string): string {
  if (priceCents === 0) return "Free";
  const amount = priceCents / 100;
  const symbol = currency.toLowerCase() === "gbp" ? "£" : currency.toLowerCase() === "usd" ? "$" : "";
  const formatted = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${symbol}${formatted}`;
}
