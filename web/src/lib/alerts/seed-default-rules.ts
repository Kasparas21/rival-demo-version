import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ALL_ALERT_TYPES,
  DEFAULT_THRESHOLDS,
  STARTER_DEFAULT_ENABLED_TYPES,
  type AlertType,
} from "@/lib/alerts/alert-types";
import type { Database, Json } from "@/lib/supabase/types";

export type AlertRuleRow = Database["public"]["Tables"]["alert_rules"]["Row"];

export async function seedDefaultAlertRulesIfEmpty(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<AlertRuleRow[]> {
  const { data: existing, error: fetchErr } = await supabase
    .from("alert_rules")
    .select("*")
    .eq("user_id", userId);

  if (fetchErr) {
    throw new Error(fetchErr.message);
  }

  if (existing && existing.length > 0) {
    return existing;
  }

  const rows = ALL_ALERT_TYPES.map((alertType) => ({
    user_id: userId,
    alert_type: alertType,
    enabled: STARTER_DEFAULT_ENABLED_TYPES.includes(alertType),
    notify_email: false,
    threshold: DEFAULT_THRESHOLDS as unknown as Json,
    competitor_id: null,
  }));

  const { data: inserted, error: insertErr } = await supabase
    .from("alert_rules")
    .upsert(rows, { onConflict: "user_id,alert_type,competitor_id", ignoreDuplicates: true })
    .select("*");

  if (insertErr) {
    throw new Error(insertErr.message);
  }

  if (inserted && inserted.length > 0) {
    return inserted;
  }

  const { data: refetched, error: refetchErr } = await supabase
    .from("alert_rules")
    .select("*")
    .eq("user_id", userId);

  if (refetchErr) {
    throw new Error(refetchErr.message);
  }

  return refetched ?? [];
}

/** Resolve the best matching rule for a competitor (specific scope wins over global). */
export function resolveRuleForType(
  rules: AlertRuleRow[],
  alertType: AlertType,
  competitorId: string
): AlertRuleRow | null {
  const scoped = rules.find((r) => r.alert_type === alertType && r.competitor_id === competitorId);
  if (scoped) return scoped;
  return rules.find((r) => r.alert_type === alertType && r.competitor_id == null) ?? null;
}
