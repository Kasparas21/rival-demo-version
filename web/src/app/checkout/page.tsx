import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function SetupError({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-[#f7f8fb] px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600">Configuration needed</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#1a1a2e] sm:text-3xl">
          Checkout is not ready yet
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#52525b]">
          Spy Rival needs Supabase and Polar environment variables configured in Vercel before checkout can load.
        </p>
        <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs font-medium text-amber-800">{message}</p>
        <div className="mt-5 text-sm leading-6 text-[#52525b]">
          Required in Vercel: <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>, <code>SUPABASE_SECRET_KEY</code>,{" "}
          <code>POLAR_ACCESS_TOKEN</code>, <code>POLAR_WEBHOOK_SECRET</code>, <code>POLAR_PRODUCT_ID</code>,{" "}
          <code>POLAR_SERVER</code>, and <code>NEXT_PUBLIC_APP_URL</code>.
        </div>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-[#1a1a2e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2d2d44]"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}

export default async function CheckoutPage() {
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch (e) {
    return <SetupError message={e instanceof Error ? e.message : "Missing server configuration."} />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/api/billing/checkout");
  }

  redirect("/api/billing/checkout");
}
