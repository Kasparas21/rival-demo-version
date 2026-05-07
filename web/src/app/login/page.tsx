import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function safeNextPath(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") && value !== "/login" ? value : null;
}

function LoginSetupError({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600">Configuration needed</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#1a1a2e]">Login is not ready yet</h1>
        <p className="mt-3 text-sm leading-6 text-[#52525b]">
          Add the Supabase environment variables in Vercel, then redeploy.
        </p>
        <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs font-medium text-amber-800">{message}</p>
      </div>
    </main>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const safeNext = safeNextPath(firstParam(params.next));
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch (e) {
    return <LoginSetupError message={e instanceof Error ? e.message : "Missing Supabase configuration."} />;
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
    if (!profile?.onboarding_completed) {
      redirect(safeNext ? `/onboarding?next=${encodeURIComponent(safeNext)}` : "/onboarding");
    }
    redirect(safeNext ?? "/dashboard");
  }

  return <LoginForm />;
}
