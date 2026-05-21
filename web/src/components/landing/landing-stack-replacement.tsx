import Link from "next/link";
import type { ReactNode } from "react";
import { Check, Plus, X } from "lucide-react";

import { LandingHeadlineHighlight } from "@/components/landing/landing-headline-highlight";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import {
  GoogleLogo,
  LinkedInLogo,
  MetaLogo,
  RedditLogo,
  SnapchatLogo,
  TikTokLogo,
} from "@/components/platform-logos";
import { RivalLogoImg } from "@/components/rival-logo";
import {
  WITHOUT_RIVAL_PAIN_POINTS,
  WITHOUT_RIVAL_STACK,
  WITH_RIVAL_FEATURES,
  WITH_RIVAL_PLATFORMS,
} from "@/components/landing/landing-stack-replacement-data";

const stackGlassCardClass =
  "rounded-2xl border border-white/70 bg-white/52 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_20px_56px_-24px_rgba(74,127,165,0.28)] backdrop-blur-2xl backdrop-saturate-[1.45] ring-1 ring-white/50";

const rivalGlassCardClass =
  "rounded-[1.75rem] border-2 border-[#4a7fa5]/45 bg-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_28px_72px_-20px_rgba(74,127,165,0.42),0_0_0_1px_rgba(255,255,255,0.6)_inset] backdrop-blur-[28px] backdrop-saturate-[1.5] ring-1 ring-[#4a7fa5]/15";

const PLATFORM_ICONS: Record<(typeof WITH_RIVAL_PLATFORMS)[number], ReactNode> = {
  Meta: <MetaLogo className="mx-auto block h-[14px] w-[22px]" />,
  Google: <GoogleLogo className="mx-auto block h-4 w-4" />,
  TikTok: <TikTokLogo className="mx-auto block h-[15px] w-[14px]" />,
  LinkedIn: <LinkedInLogo className="mx-auto block h-[14px] w-[14px]" />,
  Snapchat: <SnapchatLogo className="mx-auto block size-[18px]" />,
  Reddit: <RedditLogo className="mx-auto block size-[15px]" />,
};

function StackToolRow({ name, icon: Icon, iconClass, iconBg }: (typeof WITHOUT_RIVAL_STACK)[number]) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-white/80 bg-white/72 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_16px_-8px_rgba(31,38,135,0.12)] backdrop-blur-md">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className={`size-5 ${iconClass}`} strokeWidth={2.25} aria-hidden />
      </span>
      <span className="text-sm font-semibold text-[#1a1a1a] sm:text-[15px]">{name}</span>
    </div>
  );
}

function WithRivalPlatformStrip() {
  return (
    <div className="mt-6 rounded-2xl border border-white/75 bg-white/50 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-md sm:px-5 sm:py-5">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-[#4a7fa5]">
        All 6 platforms included
      </p>
      <div className="mt-3.5 grid grid-cols-3 gap-2.5 sm:grid-cols-6 sm:gap-2">
        {WITH_RIVAL_PLATFORMS.map((platform) => (
          <div
            key={platform}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-white/80 bg-white/70 px-2 py-2.5 shadow-sm"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(26,26,26,0.08)]">
              {PLATFORM_ICONS[platform]}
            </span>
            <span className="text-[10px] font-semibold text-gray-600 sm:text-[11px]">{platform}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LandingStackReplacement() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-[8%] h-72 w-72 rounded-full bg-[#4a7fa5]/14 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-[22%] h-64 w-64 rounded-full bg-[#95C14B]/12 blur-[90px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[6%] left-1/3 h-80 w-80 rounded-full bg-[#dbeafe]/45 blur-[110px]"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-[clamp(2rem,6.5vw,3.25rem)] font-bold lowercase leading-[1.08] tracking-tight text-[#1a1a1a]">
            replace your <LandingHeadlineHighlight>whole spy-tool stack</LandingHeadlineHighlight> with one.
          </h2>
        </div>

        <div className="relative mt-10 sm:mt-14 lg:mt-16">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 hidden size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/75 text-xs font-bold uppercase tracking-[0.18em] text-[#4a7fa5] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_32px_-8px_rgba(74,127,165,0.35)] backdrop-blur-xl lg:flex"
          >
            vs
          </div>

          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-8">
            <article className={`relative flex flex-col ${stackGlassCardClass} p-5 sm:p-7`}>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-2xl bg-gradient-to-b from-[#fef2f2]/80 to-transparent"
              />
              <header className="relative flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-[#ef4444]/12 ring-1 ring-[#ef4444]/25">
                  <X className="size-5 text-[#ef4444]" strokeWidth={2.75} aria-hidden />
                </span>
                <h3 className="text-xl font-bold text-[#1a1a1a]">Without Rival</h3>
              </header>

              <div className="relative mt-6 space-y-0">
                {WITHOUT_RIVAL_STACK.map((tool, index) => (
                  <div key={tool.name}>
                    <StackToolRow {...tool} />
                    {index < WITHOUT_RIVAL_STACK.length - 1 ? (
                      <div className="flex justify-center py-2" aria-hidden>
                        <span className="flex size-7 items-center justify-center rounded-full bg-[#ef4444]/10 text-[#ef4444] ring-1 ring-[#ef4444]/20">
                          <Plus className="size-4" strokeWidth={3} />
                        </span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <ul className="relative mt-6 space-y-3 border-t border-white/60 pt-5">
                {WITHOUT_RIVAL_PAIN_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm leading-snug text-gray-600 sm:text-[15px]">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center text-[#ef4444]">
                      <X className="size-4" strokeWidth={2.75} aria-hidden />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>

              <div className="relative mt-auto pt-5">
                <div className="rounded-xl border border-[#fecaca]/80 bg-[#fef2f2]/75 px-4 py-3.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-sm">
                  <p className="text-[15px] font-bold text-[#dc2626] sm:text-base">$250–400/mo + hours of manual work</p>
                </div>
              </div>
            </article>

            <div className="flex justify-center lg:hidden" aria-hidden>
              <span className="inline-flex size-12 items-center justify-center rounded-full border border-white/80 bg-white/75 text-[10px] font-bold uppercase tracking-[0.18em] text-[#4a7fa5] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_24px_-8px_rgba(74,127,165,0.3)] backdrop-blur-xl">
                vs
              </span>
            </div>

            <article className={`relative flex flex-col ${rivalGlassCardClass} p-5 sm:p-7`}>
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-px rounded-[1.75rem] bg-gradient-to-br from-white/60 via-transparent to-[#4a7fa5]/10 opacity-80"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#4a7fa5]/20 blur-3xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-[#95C14B]/15 blur-3xl"
              />

              <div className="relative flex flex-1 flex-col">
                <header className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-[#4a7fa5]/12 ring-1 ring-[#4a7fa5]/30">
                    <Check className="size-5 text-[#4a7fa5]" strokeWidth={3} aria-hidden />
                  </span>
                  <h3 className="text-xl font-bold text-[#1a1a1a]">With Rival</h3>
                </header>

                <div className="mt-6 flex justify-center">
                  <div className="rounded-2xl border border-white/75 bg-white/55 px-10 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_32px_-12px_rgba(74,127,165,0.25)] backdrop-blur-xl sm:px-12 sm:py-6">
                    <RivalLogoImg className="mx-auto h-11 w-auto max-w-[180px] object-contain sm:h-12" />
                  </div>
                </div>

                <WithRivalPlatformStrip />

                <ul className="mt-6 space-y-3 sm:mt-7 sm:space-y-3.5">
                  {WITH_RIVAL_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-[15px] leading-snug text-[#1a1a1a] sm:text-base">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#4a7fa5]/12 ring-1 ring-[#4a7fa5]/25">
                        <Check className="size-4 text-[#4a7fa5]" strokeWidth={3} aria-hidden />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto space-y-4 pt-6 sm:space-y-5 sm:pt-7">
                  <p className="text-center text-xl font-bold text-[#4a7fa5] sm:text-2xl">
                    $59–79/mo <span className="font-semibold text-[#4a7fa5]/80">• zero glue work</span>
                  </p>

                  <div className="rounded-xl border border-[#bfdbfe]/80 bg-[#eff6ff]/75 px-4 py-3.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-sm">
                    <p className="text-sm font-bold text-[#1e40af] sm:text-[15px]">Save $170+/mo vs a 6-tool stack</p>
                    <p className="mt-1 text-xs text-[#4a7fa5]/90 sm:text-[13px]">
                      7-day trial · 1 competitor · cancel anytime
                    </p>
                  </div>

                  <LandingTrialCta href="/checkout" size="lg">
                    Start 7-day free trial
                    <span aria-hidden>→</span>
                  </LandingTrialCta>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
