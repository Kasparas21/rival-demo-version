import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Uses the authenticated Supabase client (user JWT) so RLS policies
 * `auth.uid() = id` / `auth.uid() = user_id` apply. The service-role client
 * does not always behave the same across projects for these writes.
 */
export async function ensureUserProfile(supabase: SupabaseClient<Database>, user: User) {
  const meta = user.user_metadata ?? {};
  const fullName =
    typeof meta.full_name === "string"
      ? meta.full_name
      : typeof meta.name === "string"
        ? meta.name
        : null;
  const avatarUrl = typeof meta.avatar_url === "string" ? meta.avatar_url : null;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name: fullName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    }
  );

  if (error) {
    throw error;
  }

  const { data: existingBrands, error: brandsReadError } = await supabase
    .from("brands")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (brandsReadError) {
    throw brandsReadError;
  }

  if (!existingBrands?.length) {
    const { error: insertError } = await supabase.from("brands").insert({
      user_id: user.id,
      name: "My Brand",
      is_primary: true,
      color: "#343434",
    });
    if (insertError) {
      throw insertError;
    }
  }
}
