/** Client-safe Supabase key: prefer publishable (`sb_publishable_…`), fall back to legacy anon JWT. */
export function resolveSupabasePublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    undefined
  );
}

export function getPublicSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabasePublishableKey = resolveSupabasePublishableKey();

  if (!supabaseUrl) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabasePublishableKey) {
    throw new Error(
      "Missing Supabase client key: set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY) in web/.env.local"
    );
  }

  return {
    supabaseUrl,
    supabasePublishableKey,
  };
}

export function getServerSupabaseEnv() {
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseSecretKey) {
    throw new Error(
      "Missing Supabase server key: set SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) in web/.env.local"
    );
  }

  return {
    supabaseSecretKey,
  };
}
