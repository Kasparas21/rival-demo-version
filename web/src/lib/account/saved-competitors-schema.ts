import type { SupabaseClient } from "@supabase/supabase-js";

import { isMissingDbColumnError } from "@/lib/supabase/postgrest-schema-error";
import type { Database } from "@/lib/supabase/types";

export type SavedCompetitorsColumnSupport = {
  adsLibraryContext: boolean;
  workspaceBrand: boolean;
};

async function probeSavedCompetitorsColumn(
  supabase: SupabaseClient<Database>,
  userId: string,
  column: "is_workspace_brand" | "ads_library_context",
): Promise<boolean> {
  const { error } = await supabase
    .from("saved_competitors")
    .select(column)
    .eq("user_id", userId)
    .limit(1);
  if (!error) return true;
  if (isMissingDbColumnError(error.message, column)) return false;
  throw error;
}

/** Detect optional `saved_competitors` columns so queries work before migrations are applied. */
export async function probeSavedCompetitorsColumns(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<SavedCompetitorsColumnSupport> {
  const [workspaceBrand, adsLibraryContext] = await Promise.all([
    probeSavedCompetitorsColumn(supabase, userId, "is_workspace_brand"),
    probeSavedCompetitorsColumn(supabase, userId, "ads_library_context"),
  ]);
  return { workspaceBrand, adsLibraryContext };
}

export function friendlySavedCompetitorsSchemaError(message: string | undefined): string {
  const raw = (message ?? "").trim();
  if (!raw) {
    return "Could not finish account setup for analytics and ad detail.";
  }
  if (isMissingDbColumnError(raw, "ads_library_context")) {
    return "Your database is missing a recent migration (ads_library_context). Ads still load from cache — retry setup or run Supabase migrations.";
  }
  if (isMissingDbColumnError(raw, "is_workspace_brand")) {
    return "Your database is missing a recent migration (is_workspace_brand). Retry setup or run Supabase migrations.";
  }
  if (raw === "no_brand_domain") {
    return "Set your brand domain in Settings or complete onboarding to enable analytics and ad detail.";
  }
  return raw;
}
