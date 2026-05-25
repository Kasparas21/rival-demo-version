import { Suspense } from "react";
import Link from "next/link";
import CheckoutSuccessClient from "./checkout-success-client";
import { RivalLogoImg } from "@/components/rival-logo";
import { RivalVideoShell } from "@/components/ui/rival-video-shell";
import { glassPanelClass } from "@/components/ui/glass-styles";

function CheckoutSuccessFallback() {
  return (
    <RivalVideoShell footerTint="light">
      <div className="flex w-full flex-col items-center px-4 sm:px-6">
        <Link
          href="/"
          className="mb-8 rounded-2xl border border-white/60 bg-white/40 px-5 py-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md"
        >
          <RivalLogoImg className="h-8 w-auto max-w-[180px] object-contain object-center sm:h-9" />
        </Link>
        <div className={`w-full max-w-[520px] text-center ${glassPanelClass}`}>
          <p className="text-[13px] text-gray-600">Loading your confirmation…</p>
        </div>
      </div>
    </RivalVideoShell>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<CheckoutSuccessFallback />}>
      <CheckoutSuccessClient />
    </Suspense>
  );
}
