import { Bot } from "lucide-react";

import { HowItWorksDomainMock } from "@/components/landing/how-it-works-domain-mock";
import {
  LandingHeadlineHighlight,
  landingSectionHeadlineClasses,
} from "@/components/landing/landing-headline-highlight";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { LandingContactCta } from "@/components/landing/landing-contact-provider";
import {
  GoogleLogo,
  InstagramLogo,
  MetaLogo,
  TikTokLogo,
} from "@/components/platform-logos";
import type { LandingCopy } from "@/lib/i18n/landing/types";

const STEP_NUMBERS = ["01", "02", "03"] as const;

function SlackHashMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#E01E5A"
        d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313z"
      />
      <path
        fill="#36C5F0"
        d="M8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312z"
      />
      <path
        fill="#2EB67D"
        d="M18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 01-2.523 2.521 2.528 2.528 0 01-2.52-2.521V2.522A2.528 2.528 0 0115.163 0a2.528 2.528 0 012.523 2.522v6.312z"
      />
      <path
        fill="#ECB22E"
        d="M15.163 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.163 24a2.528 2.528 0 01-2.523-2.522v-2.522h2.523zm0-1.27a2.528 2.528 0 01-2.523-2.523 2.528 2.528 0 012.523-2.52h6.312A2.528 2.528 0 0124 15.163a2.528 2.528 0 01-2.522 2.523h-6.313z"
      />
    </svg>
  );
}

function StepScanMock() {
  const channels = [
    { label: "Paid ads", logos: [MetaLogo, GoogleLogo, TikTokLogo] },
    { label: "Organic social", logos: [InstagramLogo, TikTokLogo] },
    { label: "Email marketing", logos: null },
  ];

  return (
    <div className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-[0_20px_50px_-24px_rgba(74,127,165,0.45)] backdrop-blur-xl backdrop-saturate-150 sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Scanning channels</p>
      <ul className="mt-3 space-y-2.5">
        {channels.map((channel) => (
          <li
            key={channel.label}
            className="flex items-center justify-between gap-3 rounded-xl border border-[#e5e7eb]/90 bg-white/90 px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex -space-x-1">
                {channel.logos
                  ? channel.logos.map((Logo, i) => (
                      <span
                        key={i}
                        className="flex size-7 items-center justify-center rounded-full bg-white ring-1 ring-black/[0.06]"
                      >
                        <Logo className="h-3.5 w-3.5" />
                      </span>
                    ))
                  : (
                    <span className="flex size-7 items-center justify-center rounded-full bg-[#dcfce7] text-[#15803d] ring-1 ring-black/[0.06]">
                      <span className="text-[10px] font-bold">@</span>
                    </span>
                  )}
              </span>
              <span className="truncate text-sm font-semibold text-[#1a1a1a]">{channel.label}</span>
            </div>
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#95C14B]" aria-hidden />
              <span className="text-[11px] font-semibold text-[#5c7f2a]">Live</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepAutopilotMock() {
  const alerts = [
    { time: "02:14", tag: "AD", text: "4 new Meta ads - discount angle detected" },
    { time: "03:47", tag: "EMAIL", text: "Winback flow captured - 20% offer" },
    { time: "05:22", tag: "ORGANIC", text: "TikTok hook reposted 3rd time this week" },
  ];

  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-[0_24px_56px_-20px_rgba(74,127,165,0.5)] backdrop-blur-xl sm:p-5">
      <div className="flex items-center justify-between gap-2 border-b border-[#e8e8e8] pb-3">
        <div className="flex items-center gap-2">
          <SlackHashMark className="size-5" />
          <span className="text-sm font-bold text-[#1a1a1a]">rival-autopilot</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#95C14B]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#5c7f2a]">
          <span className="size-1.5 rounded-full bg-[#95C14B]" aria-hidden />
          Live 24/7
        </span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {alerts.map((alert) => (
          <li key={alert.time} className="rounded-xl border border-[#e5e7eb]/90 bg-[#fafafa]/90 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-gray-400">{alert.time}</span>
              <span className="rounded bg-[#4a7fa5]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#4a7fa5]">
                {alert.tag}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold leading-snug text-[#1a1a1a]">{alert.text}</p>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#ede9fe] bg-[#f5f3ff]/80 px-3 py-2">
        <Bot className="size-4 shrink-0 text-[#6d28d9]" strokeWidth={2.25} aria-hidden />
        <p className="text-[11px] font-medium text-[#5b21b6]">Autopilot is watching - alerts to Slack and email</p>
      </div>
    </div>
  );
}

const STEP_MOCKS = [HowItWorksDomainMock, StepScanMock, StepAutopilotMock] as const;

function TimelineNumber({ index, number }: { index: number; number: string }) {
  const isFirst = index === 0;
  const isLast = index === STEP_NUMBERS.length - 1;

  return (
    <div className="relative flex w-14 shrink-0 flex-col items-center self-stretch sm:w-16 md:w-[4.5rem]">
      {!isFirst ? (
        <div
          aria-hidden
          className="h-5 w-px shrink-0 bg-gradient-to-b from-transparent to-[#b8cfe0]/80 sm:h-7"
        />
      ) : (
        <div className="h-1 shrink-0 sm:h-2" aria-hidden />
      )}
      <span
        className="relative z-10 select-none py-0.5 text-[3.25rem] font-black leading-none tracking-tight text-[#c5d8e8] sm:text-[3.75rem] md:text-[4.5rem]"
        aria-hidden
      >
        {number}
      </span>
      {!isLast ? (
        <div
          aria-hidden
          className="min-h-6 w-px flex-1 bg-gradient-to-b from-[#b8cfe0]/80 via-[#c5d8e8]/45 to-[#b8cfe0]/15 sm:min-h-8"
        />
      ) : null}
    </div>
  );
}

type Props = {
  copy: LandingCopy["howItWorks"];
};

/** Three-step timeline - domain in, scan, Autopilot 24/7. */
export function LandingHowItWorks({ copy }: Props) {
  return (
    <section
      id="solution"
      className="relative overflow-hidden px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24 md:pt-28"
    >
      {/* Section tint - masked to fade in from the top so it never creates a hard edge
          against the white carousel area above it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_18%,rgba(74,127,165,0.09),transparent_68%),radial-gradient(ellipse_60%_40%_at_90%_80%,rgba(149,193,75,0.07),transparent_55%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_320px)] [mask-image:linear-gradient(to_bottom,transparent_0,black_320px)]"
      />
      {/* Soft white bridge - blurs the carousel → section 2 hand-off to a smooth gradient. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white via-white/70 to-transparent sm:h-52"
      />

      <LandingScrollReveal className="relative mx-auto max-w-5xl">
        <div className={`text-center ${landingNavAnchorScrollClasses}`}>
          <h2 className={landingSectionHeadlineClasses}>
            {copy.titleLine1}
            <br />
            <LandingHeadlineHighlight>{copy.titleHighlight}</LandingHeadlineHighlight>
            {copy.titleSuffix ? (
              <>
                {" "}
                <span className="text-[#1a1a1a]">{copy.titleSuffix}</span>
              </>
            ) : null}
          </h2>
        </div>

        <ol className="mt-12 space-y-10 sm:mt-16 sm:space-y-14 md:space-y-16">
          {copy.steps.map((step, index) => {
            const Mock = STEP_MOCKS[index];
            return (
              <li
                key={step.title}
                className="grid grid-cols-[3.5rem_1fr] items-stretch gap-x-4 gap-y-5 sm:grid-cols-[4rem_1fr] sm:gap-x-6 md:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1.05fr)] md:gap-x-10 md:gap-y-0"
              >
                <TimelineNumber index={index} number={STEP_NUMBERS[index]} />

                <div className="min-w-0 self-center pt-1 md:col-start-2 md:pt-0">
                  <h3 className="text-xl font-bold text-[#1a1a1a] sm:text-2xl">{step.title}</h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
                    {step.body}
                  </p>
                </div>

                <div className="col-span-2 min-w-0 self-center md:col-span-1 md:col-start-3 md:row-start-1">
                  <Mock />
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-12 flex justify-center sm:mt-16">
          <LandingContactCta size="md" trailingArrow />
        </div>
      </LandingScrollReveal>
    </section>
  );
}
