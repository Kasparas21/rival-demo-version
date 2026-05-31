import type { ReactNode } from "react";
import { Check, X } from "lucide-react";

import { LandingHeadlineHighlight } from "@/components/landing/landing-headline-highlight";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
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
  WITHOUT_RIVAL_INTRO_MOBILE,
  WITHOUT_RIVAL_PAIN_POINTS,
  WITHOUT_RIVAL_PAIN_POINTS_MOBILE,
  WITHOUT_RIVAL_STACK,
  WITH_RIVAL_FEATURES,
  WITH_RIVAL_FEATURES_MOBILE,
  WITH_RIVAL_PLATFORMS,
} from "@/components/landing/landing-stack-replacement-data";

const withoutRivalGlassCardClass =
  "rounded-[1.75rem] border border-[#ef4444]/28 bg-[#fff5f5]/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_16px_48px_-20px_rgba(239,68,68,0.22)] backdrop-blur-2xl backdrop-saturate-[1.45] ring-1 ring-[#ef4444]/12";

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

function StackToolChip({ name, icon: Icon, iconClass, iconBg }: (typeof WITHOUT_RIVAL_STACK)[number]) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/75 bg-white/62 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_4px_14px_-8px_rgba(239,68,68,0.12)] backdrop-blur-md sm:px-4 sm:py-3.5">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className={`size-[18px] ${iconClass}`} strokeWidth={2.25} aria-hidden />
      </span>
      <span className="text-[13px] font-semibold leading-tight text-[#1a1a1a] sm:text-sm">{name}</span>
    </div>
  );
}

function StackToolChipMobile({ name, icon: Icon, iconClass, iconBg }: (typeof WITHOUT_RIVAL_STACK)[number]) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-white/75 bg-white/62 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_2px_8px_-6px_rgba(239,68,68,0.12)] backdrop-blur-md">
      <span className={`flex size-6 shrink-0 items-center justify-center rounded-md ${iconBg}`}>
        <Icon className={`size-3 ${iconClass}`} strokeWidth={2.25} aria-hidden />
      </span>
      <span className="truncate text-[9px] font-semibold leading-tight text-[#1a1a1a]">{name}</span>
    </div>
  );
}

/** Desktop — unchanged. */
function WithoutRivalCard() {
  return (
    <article className={`relative flex h-full flex-col overflow-hidden ${withoutRivalGlassCardClass} p-5 sm:p-7`}>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#ef4444]/16 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-[#fca5a5]/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#ef4444]/8 via-transparent to-[#ef4444]/5"
      />

      <header className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-[#ef4444]/14 ring-1 ring-[#ef4444]/28">
            <X className="size-5 text-[#ef4444]" strokeWidth={2.75} aria-hidden />
          </span>
          <h3 className="text-xl font-bold text-[#1a1a1a]">Without Rival</h3>
        </div>
        <span className="rounded-full border border-[#ef4444]/30 bg-[#ef4444]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#b91c1c] backdrop-blur-sm">
          The old way
        </span>
      </header>

      <p className="relative mt-4 text-[13px] leading-relaxed text-[#7f1d1d]/90 sm:text-sm">
        Juggling separate ad libraries, SEO tools, and spreadsheets — then stitching it all together by hand every week.
      </p>

      <div className="relative mt-6 flex flex-1 flex-col">
        <div className="rounded-2xl border border-white/70 bg-white/45 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md sm:px-5 sm:py-5">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-[#b91c1c] sm:text-xs">
            {WITHOUT_RIVAL_STACK.length} tools · {WITHOUT_RIVAL_STACK.length} logins · zero intelligence
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {WITHOUT_RIVAL_STACK.map((tool) => (
              <StackToolChip key={tool.name} {...tool} />
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-1 flex-col rounded-2xl border border-[#ef4444]/20 bg-[#fef2f2]/45 px-4 py-4 backdrop-blur-md sm:px-5 sm:py-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#b91c1c] sm:text-xs">What you still do manually</p>
          <ul className="mt-4 flex-1 space-y-3.5 sm:space-y-4">
            {WITHOUT_RIVAL_PAIN_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-[13px] leading-snug text-[#7f1d1d]/90 sm:text-sm">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#ef4444]/10 ring-1 ring-[#ef4444]/20">
                  <X className="size-3.5 text-[#ef4444]" strokeWidth={2.75} aria-hidden />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto space-y-4 pt-6 sm:space-y-5 sm:pt-7">
          <div className="rounded-xl border border-[#ef4444]/25 bg-[#fef2f2]/70 px-4 py-3.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur-md sm:py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#b91c1c]">What you pay today</p>
            <p className="mt-1 text-lg font-bold text-[#dc2626] sm:text-xl">€350/mo</p>
            <p className="mt-1.5 text-[12px] font-medium text-[#991b1b]/85 sm:text-[13px]">+ hours of manual glue work every week</p>
            <div className="mt-3 space-y-1.5 border-t border-[#ef4444]/15 pt-3 text-[12px] leading-snug text-[#991b1b]/80 sm:text-[13px]">
              <p>~4 hrs/week stitching tabs into one view</p>
              <p>6 renewals · 6 passwords · no strategy map</p>
              <p>Still guessing what to test next Monday</p>
            </div>
          </div>

          <div className="rounded-xl border border-[#ef4444]/25 bg-[#fef2f2]/60 px-4 py-3.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur-sm">
            <p className="text-sm font-bold text-[#991b1b] sm:text-[15px]">€270+/mo more than Rival · every month</p>
            <p className="mt-1 text-xs text-[#b91c1b]/85 sm:text-[13px]">6 logins · 6 renewals · no strategy map</p>
          </div>

          <div className="flex min-h-[52px] items-center justify-center rounded-full border border-[#ef4444]/25 bg-[#ef4444]/8 px-6 text-sm font-bold text-[#991b1b]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-sm">
            6 tools · zero payoff
          </div>
        </div>
      </div>
    </article>
  );
}

/** Mobile-only compact card. */
function WithoutRivalCardMobile() {
  return (
    <article className={`relative overflow-hidden ${withoutRivalGlassCardClass} p-3.5`}>
      <header className="relative flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#ef4444]/14 ring-1 ring-[#ef4444]/28">
            <X className="size-3.5 text-[#ef4444]" strokeWidth={2.75} aria-hidden />
          </span>
          <h3 className="text-base font-bold text-[#1a1a1a]">Without Rival</h3>
        </div>
        <span className="shrink-0 rounded-full border border-[#ef4444]/30 bg-[#ef4444]/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-[#b91c1c]">
          The old way
        </span>
      </header>

      <p className="relative mt-2 text-[11px] leading-snug text-[#7f1d1d]/90">{WITHOUT_RIVAL_INTRO_MOBILE}</p>

      <div className="relative mt-3 rounded-xl border border-white/70 bg-white/45 px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md">
        <p className="text-center text-[9px] font-bold uppercase tracking-[0.1em] text-[#b91c1c]">
          6 tools · 6 logins · zero intelligence
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {WITHOUT_RIVAL_STACK.map((tool) => (
            <StackToolChipMobile key={tool.name} {...tool} />
          ))}
        </div>
      </div>

      <div className="relative mt-3 rounded-xl border border-[#ef4444]/20 bg-[#fef2f2]/45 px-2.5 py-2.5 backdrop-blur-md">
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#b91c1c]">Still manual</p>
        <ul className="mt-2 space-y-1.5">
          {WITHOUT_RIVAL_PAIN_POINTS_MOBILE.map((point) => (
            <li key={point} className="flex items-start gap-2 text-[10px] leading-snug text-[#7f1d1d]/90">
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[#ef4444]/10 ring-1 ring-[#ef4444]/20">
                <X className="size-2.5 text-[#ef4444]" strokeWidth={2.75} aria-hidden />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-3 rounded-xl border border-[#ef4444]/25 bg-[#fef2f2]/70 px-3 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur-md">
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#b91c1c]">What you pay today</p>
        <p className="mt-0.5 text-base font-bold text-[#dc2626]">€350/mo</p>
        <p className="mt-1 text-[10px] font-medium leading-snug text-[#991b1b]/85">
          + manual glue · €270+/mo more than Rival · 6 logins · no strategy map
        </p>
      </div>
    </article>
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

function WithRivalPlatformStripMobile() {
  return (
    <div className="mt-3 rounded-xl border border-white/75 bg-white/50 px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-md">
      <p className="text-center text-[9px] font-bold uppercase tracking-[0.1em] text-[#4a7fa5]">All 6 platforms</p>
      <div className="mt-2 grid grid-cols-6 gap-1">
        {WITH_RIVAL_PLATFORMS.map((platform) => (
          <div key={platform} className="flex flex-col items-center gap-0.5 rounded-lg border border-white/80 bg-white/70 px-0.5 py-1.5 shadow-sm">
            <span className="flex size-6 items-center justify-center rounded-full bg-white shadow-[0_1px_4px_rgba(26,26,26,0.08)]">
              {PLATFORM_ICONS[platform]}
            </span>
            <span className="text-[8px] font-semibold leading-none text-gray-600">{platform}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Desktop — unchanged. */
function WithRivalCard() {
  return (
    <article className={`relative flex h-full flex-col ${rivalGlassCardClass} p-5 sm:p-7`}>
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
          <div className="overflow-hidden rounded-2xl border border-[#4a7fa5]/40 bg-[#eff6ff]/85 px-5 py-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_14px_44px_-16px_rgba(74,127,165,0.38)] backdrop-blur-md sm:px-6 sm:py-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#4a7fa5] sm:text-xs">
              One plan · all 6 platforms
            </p>
            <p className="mt-2 text-[2.75rem] font-bold leading-none tracking-tight text-[#1a1a1a] sm:text-[3rem]">
              €79<span className="text-2xl font-bold text-[#4a7fa5] sm:text-[2.25rem]">/mo</span>
            </p>
            <p className="mt-2 text-sm font-semibold text-[#4a7fa5] sm:text-base">Zero glue work · one login</p>
          </div>

          <div className="rounded-xl border border-[#95C14B]/30 bg-[#f3f9e8]/75 px-4 py-3.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-sm">
            <p className="text-sm font-bold text-[#4a6b24] sm:text-[15px]">Save €270+/mo vs a 6-tool stack</p>
            <p className="mt-1 text-xs text-[#5a7f2e]/90 sm:text-[13px]">
              7-day trial · 1 competitor · cancel anytime
            </p>
          </div>

          <LandingTrialCta href="/onboarding" size="lg">
            Start 7-day free trial
            <span aria-hidden>→</span>
          </LandingTrialCta>
        </div>
      </div>
    </article>
  );
}

/** Mobile-only compact card. */
function WithRivalCardMobile() {
  return (
    <article className={`relative flex flex-col ${rivalGlassCardClass} p-3.5`}>
      <header className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#4a7fa5]/12 ring-1 ring-[#4a7fa5]/30">
            <Check className="size-3.5 text-[#4a7fa5]" strokeWidth={3} aria-hidden />
          </span>
          <h3 className="text-base font-bold text-[#1a1a1a]">With Rival</h3>
        </div>
        <RivalLogoImg className="h-5 w-auto max-w-[72px] shrink-0 object-contain" />
      </header>

      <WithRivalPlatformStripMobile />

      <ul className="mt-3 space-y-1.5">
        {WITH_RIVAL_FEATURES_MOBILE.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-[11px] leading-snug text-[#1a1a1a]">
            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[#4a7fa5]/12 ring-1 ring-[#4a7fa5]/25">
              <Check className="size-2.5 text-[#4a7fa5]" strokeWidth={3} aria-hidden />
            </span>
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-3 space-y-2">
        <div className="rounded-xl border border-[#4a7fa5]/40 bg-[#eff6ff]/85 px-3 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_24px_-12px_rgba(74,127,165,0.3)] backdrop-blur-md">
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#4a7fa5]">One plan · all 6 platforms</p>
          <p className="mt-1 text-2xl font-bold leading-none tracking-tight text-[#1a1a1a]">
            €79<span className="text-lg font-bold text-[#4a7fa5]">/mo</span>
          </p>
          <p className="mt-1 text-[10px] font-semibold text-[#4a7fa5]">Save €270+/mo · 7-day trial</p>
        </div>

        <LandingTrialCta href="/onboarding" size="lg" className="w-full">
          Start 7-day free trial
          <span aria-hidden>→</span>
        </LandingTrialCta>
      </div>
    </article>
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

      <LandingScrollReveal className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
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

          {/* Mobile-only compact stack */}
          <div className="flex flex-col gap-3 md:hidden">
            <WithoutRivalCardMobile />
            <div className="flex justify-center" aria-hidden>
              <span className="inline-flex size-9 items-center justify-center rounded-full border border-white/80 bg-white/75 text-[9px] font-bold uppercase tracking-[0.16em] text-[#4a7fa5] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_6px_18px_-6px_rgba(74,127,165,0.3)] backdrop-blur-xl">
                vs
              </span>
            </div>
            <WithRivalCardMobile />
          </div>

          {/* Desktop — unchanged side-by-side layout */}
          <div className="hidden flex-col gap-6 md:flex lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-8">
            <WithoutRivalCard />
            <div className="flex justify-center lg:hidden" aria-hidden>
              <span className="inline-flex size-12 items-center justify-center rounded-full border border-white/80 bg-white/75 text-[10px] font-bold uppercase tracking-[0.18em] text-[#4a7fa5] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_24px_-8px_rgba(74,127,165,0.3)] backdrop-blur-xl">
                vs
              </span>
            </div>
            <WithRivalCard />
          </div>
        </div>
      </LandingScrollReveal>
    </section>
  );
}
