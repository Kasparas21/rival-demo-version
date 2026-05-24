import { Suspense } from "react";
import CheckoutSuccessClient from "./checkout-success-client";

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7f8fb] px-6 py-16">
          <div className="mx-auto max-w-xl rounded-3xl border border-[#dcfce7] bg-white p-8 text-center shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">You&apos;re subscribed</p>
            <p className="mt-4 text-sm text-[#71717a]">Loading…</p>
          </div>
        </main>
      }
    >
      <CheckoutSuccessClient />
    </Suspense>
  );
}
