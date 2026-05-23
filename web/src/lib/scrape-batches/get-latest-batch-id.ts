import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

export async function getLatestScrapeBatchId(
  supabase: SupabaseClient<Database>,
  competitorId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("scrape_batches")
    .select("id")
    .eq("competitor_id", competitorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}
