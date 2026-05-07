import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] px-6 py-16">
      <div className="mx-auto max-w-xl rounded-3xl border border-[#dcfce7] bg-white p-8 text-center shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">Checkout complete</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e]">Your subscription is being activated</h1>
        <p className="mt-3 text-sm leading-6 text-[#52525b]">
          Polar has accepted the checkout. It can take a few seconds for the webhook to update your account status.
        </p>
        <Link
          href="/dashboard/settings"
          className="mt-7 inline-flex rounded-xl bg-[#1a1a2e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2d2d44]"
        >
          View account settings
        </Link>
      </div>
    </main>
  );
}
