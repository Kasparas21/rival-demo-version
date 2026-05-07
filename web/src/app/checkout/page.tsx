import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CheckoutPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/checkout");
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-6 py-16">
      <div className="mx-auto max-w-xl rounded-3xl border border-[#ececef] bg-white p-8 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#4a7fa5]">Spy Rival subscription</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e]">Start your 1-day free trial</h1>
        <p className="mt-3 text-sm leading-6 text-[#52525b]">
          Checkout is securely handled by Polar. Your Spy Rival account will unlock as soon as Polar confirms the
          trialing or active subscription through the webhook.
        </p>

        <div className="mt-6 rounded-2xl bg-[#f8fafc] p-4 text-sm text-[#3f3f46]">
          <p className="font-semibold text-[#1a1a2e]">Included during trial</p>
          <ul className="mt-3 space-y-2">
            <li>15 fresh ad-library searches per month.</li>
            <li>Up to 10 monitored competitors.</li>
            <li>AI strategy maps and insight summaries.</li>
          </ul>
        </div>

        <form action="/api/billing/checkout" method="post" className="mt-7">
          <button
            type="submit"
            className="w-full rounded-xl bg-[#1a1a2e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2d2d44]"
          >
            Continue to Polar checkout
          </button>
        </form>

        <Link
          href="/dashboard"
          className="mt-4 block text-center text-xs font-medium text-[#71717a] underline-offset-4 hover:text-[#1a1a2e] hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
