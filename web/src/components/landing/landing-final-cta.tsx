import Link from "next/link";

export function LandingFinalCTA() {
  return (
    <section className="overflow-hidden py-20 text-center sm:py-32">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <h2 className="text-[clamp(2.65rem,12vw,4.5rem)] font-bold leading-[1.05] tracking-[-0.04em] text-[#1a1a1a]">
          Stop guessing what your
          <br />
          competitor <span className="text-[#4a7fa5]">is doing.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-gray-500 sm:text-base">
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
            href="/checkout"
            className="w-full max-w-sm rounded-full bg-[#1a1a1a] px-8 py-4 text-base font-semibold text-white shadow-xl hover:opacity-90 sm:w-auto sm:max-w-none sm:px-12 sm:py-5 sm:text-lg"
          >
            Start your 1-day free trial
          </Link>
          <p className="mt-4 text-xs text-gray-400">Cancel anytime from your Polar customer portal</p>
        </div>
      </div>
    </section>
  );
}
