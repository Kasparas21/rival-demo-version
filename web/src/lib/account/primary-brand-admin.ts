import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/** Prefer primary workspace brand; otherwise oldest brand row for this user. */
export async function fetchPrimaryBrandContext(
  admin: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const { data, error } = await admin
    .from("brands")
    .select("brand_context")
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const raw = data.brand_context;
  return raw == null ? null : raw;
}

export async function patchPrimaryBrandForUser(
  admin: SupabaseClient<Database>,
  userId: string,
  patch: Database["public"]["Tables"]["brands"]["Update"]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: rows, error: selErr } = await admin
    .from("brands")
    .select("id")
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);

  if (selErr) return { ok: false, error: selErr.message };
  const id = rows?.[0]?.id;
  if (!id) return { ok: true };

  const { error } = await admin.from("brands").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
