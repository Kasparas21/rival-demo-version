import { analyzeCompetitorEmail } from "./analyze";
import { MAX_AI_ANALYSIS_ATTEMPTS } from "./constants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Run AI analysis for captured emails that never completed processing. */
export async function analyzePendingCompetitorEmails(args: {
  competitorId: string;
  userId?: string;
  limit?: number;
}): Promise<{ analyzed: number; failed: number; quotaBlocked: number }> {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("competitor_emails")
    .select("id")
    .eq("competitor_id", args.competitorId)
    .is("ai_processed_at", null)
    .lt("ai_analysis_attempts", MAX_AI_ANALYSIS_ATTEMPTS)
    .order("received_at", { ascending: false })
    .limit(args.limit ?? 20);

  if (args.userId) {
    query = query.eq("user_id", args.userId);
  }

  const { data: rows, error } = await query;
  if (error || !rows?.length) {
    return { analyzed: 0, failed: 0, quotaBlocked: 0 };
  }

  let analyzed = 0;
  let failed = 0;
  let quotaBlocked = 0;
  for (const row of rows) {
    const result = await analyzeCompetitorEmail(row.id);
    if (result.ok) {
      analyzed += 1;
    } else if (result.quotaExceeded) {
      quotaBlocked += 1;
      break;
    } else {
      failed += 1;
    }
  }
  return { analyzed, failed, quotaBlocked };
}
