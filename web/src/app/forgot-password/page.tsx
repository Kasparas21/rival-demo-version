import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthSetupError } from "@/components/auth/auth-setup-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const initialEmail = firstParam(params.email) ?? "";

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch (e) {
    return <AuthSetupError message={e instanceof Error ? e.message : "Missing Supabase configuration."} />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();
    redirect(profile?.onboarding_completed ? "/dashboard" : "/onboarding");
  }

  return <ForgotPasswordForm initialEmail={initialEmail} />;
}
