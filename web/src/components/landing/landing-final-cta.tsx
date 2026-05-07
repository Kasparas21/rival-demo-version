import Link from "next/link";

export function LandingFinalCTA() {
  return (
    <section className="py-32 text-center">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-6xl font-bold leading-tight text-[#1a1a1a]">
          Stop guessing what your
          <br />
          competitor <span className="text-[#4a7fa5]">is doing.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-sm text-base text-gray-500">
          Run your first competitor search free. See every ad. Every platform. In 30 seconds.
        </p>
        <div className="mt-8 flex flex-col items-center gap-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="text-sm text-gray-400 line-through">$19/mo</span>
            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">
              LIMITED OFFER
            </span>
          </div>
          <Link
            href="/onboarding"
            className="rounded-full bg-[#1a1a1a] px-12 py-5 text-lg font-semibold text-white shadow-xl hover:opacity-90"
          >
            Try Rival for $3 — 3 days full access
          </Link>
          <p className="mt-4 text-xs text-gray-400">No credit card required to start · Cancel anytime</p>
        </div>
      </div>
    </section>
  );
}
