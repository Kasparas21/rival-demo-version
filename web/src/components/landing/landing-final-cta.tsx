import { LandingHeadlineHighlight } from "@/components/landing/landing-headline-highlight";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";

export function LandingFinalCTA() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4a7fa5]/12 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-[18%] h-56 w-56 rounded-full bg-[#95C14B]/10 blur-[90px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-12 bottom-[12%] h-64 w-64 rounded-full bg-[#dbeafe]/50 blur-[100px]"
      />

      <div className="relative mx-auto w-full max-w-3xl px-4 text-center sm:px-6">
        <LandingScrollReveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/45 px-6 py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_24px_64px_-24px_rgba(74,127,165,0.35)] backdrop-blur-2xl backdrop-saturate-[1.45] ring-1 ring-white/50 sm:rounded-[2.25rem] sm:px-10 sm:py-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-[#7eb3d4]/25 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-12 -right-12 h-44 w-44 rounded-full bg-[#4a7fa5]/15 blur-3xl"
          />

          <div className="relative">
            <h2 className="text-[clamp(2.25rem,10vw,3.75rem)] font-bold lowercase leading-[1.06] tracking-[-0.04em] text-[#1a1a1a]">
              stop guessing what your
              <br />
              competitor <LandingHeadlineHighlight>is doing.</LandingHeadlineHighlight>
            </h2>

            <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-gray-500 sm:text-base">
              track one competitor free for 7 days.
            </p>

            <div className="mx-auto mt-7 inline-flex items-center gap-2 rounded-full border border-white/75 bg-white/55 px-4 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-md">
              <span className="font-semibold text-[#1a1a1a]">€79/mo</span>
              <span aria-hidden className="text-gray-300">
                ·
              </span>
              <span className="text-gray-500">€59/mo annual</span>
            </div>

            <div className="mx-auto mt-8 w-full max-w-lg">
              <LandingTrialCta href="/checkout" size="lg">
                Start your 7-day trial
                <span aria-hidden>→</span>
              </LandingTrialCta>
            </div>

            <p className="mt-5 text-xs text-gray-400">cancel anytime</p>
          </div>
          </div>
        </LandingScrollReveal>
      </div>
    </section>
  );
}
