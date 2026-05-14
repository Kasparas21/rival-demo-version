import Link from "next/link";

export function LandingFinalCTA() {
  return (
    <section id="pricing" className="overflow-hidden py-20 text-center sm:py-32">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <h2 className="text-[clamp(2.65rem,12vw,4.5rem)] font-bold leading-[1.05] tracking-[-0.04em] text-[#1a1a1a]">
          Stop guessing what your
          <br />
          competitor <span className="text-[#4a7fa5]">is doing.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-gray-500 sm:text-base">
          Start your 7-day trial. Track 1 competitor free. See every active ad, every angle, every move they make. Decide if Rival is worth
          €79/mo based on what you actually see.
        </p>
        <div className="mt-8 flex flex-col items-center gap-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="text-center text-sm font-semibold leading-snug text-[#1a1a1a]">
              €79/mo
              <br />
              <span className="font-normal text-gray-600">Or €59/mo billed annually</span>
            </span>
            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">
              SAVE 25% ANNUAL
            </span>
          </div>
          <Link
            href="/checkout"
            className="w-full max-w-sm rounded-full bg-[#1a1a1a] px-8 py-4 text-base font-semibold text-white shadow-xl hover:opacity-90 sm:w-auto sm:max-w-none sm:px-12 sm:py-5 sm:text-lg"
          >
            Start 7-day trial
          </Link>
          <p className="mt-4 text-xs text-gray-400">7-day trial · 1 competitor · Card required · Cancel anytime</p>
        </div>
      </div>
    </section>
  );
}
