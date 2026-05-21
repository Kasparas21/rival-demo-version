import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { isMissingDbColumnError } from "@/lib/supabase/postgrest-schema-error";
import type { Database } from "@/lib/supabase/types";

/** Mirrors client `NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION` gating for own-brand saved ads. */
export function isWorkspaceBrandSavedAdsDebugEnabled(): boolean {
  return (
    process.env.DEBUG_PLATFORM_CLASSIFICATION === "true" ||
    process.env.NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION === "true"
  );
}

async function isWorkspaceBrandCompetitor(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
): Promise<boolean> {
  const cid = competitorId.trim();
  if (!cid) return false;

  const { data, error } = await supabase
    .from("saved_competitors")
    .select("is_workspace_brand")
    .eq("user_id", userId)
    .eq("id", cid)
    .maybeSingle();

  if (error) {
    if (isMissingDbColumnError(error.message, "is_workspace_brand")) {
      return false;
    }
    throw error;
  }

  return data?.is_workspace_brand === true;
}

/** True when saved-ads bookmark APIs should be blocked for this workspace-brand row. */
export async function isWorkspaceBrandSavedAdsBlocked(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
): Promise<boolean> {
  if (isWorkspaceBrandSavedAdsDebugEnabled()) return false;
  return isWorkspaceBrandCompetitor(supabase, userId, competitorId);
}

/** Blocks saved-ads routes for workspace-brand rows unless debug flag is on. */
export async function denyIfWorkspaceBrandSavedAdsBlocked(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
): Promise<NextResponse | null> {
  const blocked = await isWorkspaceBrandSavedAdsBlocked(supabase, userId, competitorId);
  if (!blocked) return null;

  return NextResponse.json(
    { ok: false, error: "Saved ads for your brand are not available." },
    { status: 403 },
  );
}
