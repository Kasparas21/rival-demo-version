import type { SupabaseClient } from "@supabase/supabase-js";

import type { AgentBaselineMetrics, AgentEmailInput, DetectedAgentSignal } from "@/lib/agent/types";
import type { Database } from "@/lib/supabase/types";

async function countEmailsThisWeek(
  admin: SupabaseClient<Database>,
  competitorId: string,
): Promise<number> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { count } = await admin
    .from("competitor_emails")
    .select("id", { count: "exact", head: true })
    .eq("competitor_id", competitorId)
    .gte("received_at", since);

  return count ?? 0;
}

async function isNewHookType(
  admin: SupabaseClient<Database>,
  competitorId: string,
  hookType: string,
  excludeEmailId?: string,
): Promise<boolean> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  let query = admin
    .from("competitor_emails")
    .select("id, email_type, ai_angle")
    .eq("competitor_id", competitorId)
    .gte("received_at", since);

  if (excludeEmailId) query = query.neq("id", excludeEmailId);

  const { data } = await query.limit(200);
  const normalized = hookType.trim().toLowerCase();

  for (const row of data ?? []) {
    const types = [row.email_type, row.ai_angle].filter(Boolean).map((v) => String(v).trim().toLowerCase());
    if (types.includes(normalized)) return false;
  }

  return true;
}

function classifyHook(email: AgentEmailInput): string {
  return (email.ai_angle ?? email.email_type ?? "unknown").trim().toLowerCase();
}

export async function detectEmailSignals(params: {
  admin: SupabaseClient<Database>;
  competitorId: string;
  newEmails: AgentEmailInput[];
  baseline: AgentBaselineMetrics;
}): Promise<DetectedAgentSignal[]> {
  const { admin, competitorId, newEmails, baseline } = params;
  const signals: DetectedAgentSignal[] = [];
  const avgPerWeek = baseline.email?.avg_emails_per_week ?? 0;

  const emailsThisWeek = await countEmailsThisWeek(admin, competitorId);
  if (emailsThisWeek >= avgPerWeek * 2 && emailsThisWeek >= 3 && newEmails.length > 0) {
    signals.push({
      signal_type: "new_email_campaign",
      source: "email",
      threat_score: 7,
      payload: {
        emails: newEmails,
        emails_this_week: emailsThisWeek,
        normal_avg: avgPerWeek,
        pattern: "aggressive_frequency",
      },
    });
  }

  for (const email of newEmails) {
    const hookType = classifyHook(email);
    if (hookType !== "unknown" && (await isNewHookType(admin, competitorId, hookType, email.id))) {
      signals.push({
        signal_type: "new_email_campaign",
        source: "email",
        threat_score: 6,
        payload: {
          email,
          hook_type: hookType,
          subject_line: email.subject,
          preview_text: email.preview_text,
        },
      });
    }
  }

  return signals;
}
