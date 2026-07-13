import { Bookmark, Heart, MessageCircle, Send, Trophy } from "lucide-react";
import type { ComponentType } from "react";

import {
  LandingHeadlineHighlight,
  landingSectionHeadlineClasses,
} from "@/components/landing/landing-headline-highlight";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { CoverageDemoVideo } from "@/components/landing/coverage-demo-video";
import { LandingStrategyMapMock } from "@/components/landing/landing-strategy-map-mock";
import { LandingContactCta } from "@/components/landing/landing-contact-provider";
import {
  FacebookLogo,
  GoogleLogo,
  InstagramLogo,
  LinkedInLogo,
  MetaLogo,
  PinterestLogo,
  SnapchatLogo,
  TikTokLogo,
  XLogo,
  YouTubeLogo,
} from "@/components/platform-logos";
import type { LandingCoverageCardKey, LandingCopy } from "@/lib/i18n/landing/types";

/** Shared mock viewport — every coverage card uses the same visual height. */
const COVERAGE_VISUAL_PANEL =
  "flex h-[260px] w-full shrink-0 items-stretch justify-center px-4 pb-3 pt-5 sm:h-[268px] sm:px-5";
const COVERAGE_FOOTER = "min-h-[5.75rem] shrink-0 border-t border-[#f0efec] px-5 py-4";

type PlatformLogo = ComponentType<{ className?: string }>;

const PAID_PLATFORMS: PlatformLogo[] = [
  MetaLogo,
  GoogleLogo,
  TikTokLogo,
  LinkedInLogo,
  PinterestLogo,
  SnapchatLogo,
];

const ORGANIC_PLATFORMS: PlatformLogo[] = [
  InstagramLogo,
  TikTokLogo,
  YouTubeLogo,
  LinkedInLogo,
  XLogo,
  FacebookLogo,
];

function CoveragePlatformIconRow({ logos }: { logos: PlatformLogo[] }) {
  return (
    <div className="mt-2.5 flex shrink-0 items-center justify-between px-1">
      {logos.map((Logo, i) => (
        <span
          key={i}
          className="flex size-6 items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(26,26,26,0.1)] ring-1 ring-black/[0.04]"
        >
          <Logo className="h-3 w-3" />
        </span>
      ))}
    </div>
  );
}

/* ---------- Card 1 · Paid ad mockup ---------- */
function PaidAdMock() {
  return (
    <div className="flex h-full w-full flex-col justify-between">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_4px_16px_-6px_rgba(26,26,26,0.14)]">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-[#2563eb] to-[#60a5fa] text-[11px] font-bold text-white">
            A
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[11px] font-bold text-[#1a1a1a]">Aurora Skin</p>
            <p className="text-[9px] text-gray-400">Sponsored · Meta</p>
          </div>
          <MetaLogo className="h-3.5 w-3.5" />
        </div>
        <div className="relative min-h-0 flex-1 w-full bg-[linear-gradient(135deg,#1e3a5f_0%,#4a7fa5_55%,#7eb3d4_100%)]">
          <div className="absolute inset-0 flex flex-col items-start justify-end p-3">
            <span className="rounded bg-white/95 px-1.5 py-0.5 text-[8px] font-extrabold tracking-wide text-[#1e3a5f]">
              SUMMER SALE
            </span>
            <span className="mt-1 text-[22px] font-black leading-none text-white drop-shadow sm:text-[26px]">
              −40%
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 bg-[#f5f6f7] px-3 py-2">
          <span className="truncate text-[9px] text-gray-500">aurora.com</span>
          <span className="rounded-md bg-[#e4e6eb] px-2.5 py-1 text-[9px] font-bold text-[#1a1a1a]">
            Shop Now
          </span>
        </div>
      </div>

      <CoveragePlatformIconRow logos={PAID_PLATFORMS} />
    </div>
  );
}

/* ---------- Card 2 · Organic social post mockup ---------- */
function OrganicPostMock() {
  return (
    <div className="flex h-full w-full flex-col justify-between">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_4px_16px_-6px_rgba(26,26,26,0.14)]">
        <div className="flex shrink-0 items-center gap-2 px-3 py-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-[#f97316] via-[#e11d48] to-[#7c3aed] text-[10px] font-bold text-white sm:size-7 sm:text-[11px]">
            A
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[10.5px] font-bold text-[#1a1a1a] sm:text-[11px]">aurora.skin</p>
            <p className="text-[8.5px] text-gray-400 sm:text-[9px]">Original audio · 2h</p>
          </div>
          <InstagramLogo className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
        <div className="min-h-0 flex-1 w-full bg-[linear-gradient(135deg,#fff1f2_0%,#fda4af_50%,#e11d48_100%)]" />
        <div className="shrink-0 px-3 pb-2 pt-1.5">
          <div className="flex items-center gap-3 text-[#1a1a1a]">
            <Heart className="size-[13px] fill-[#e11d48] text-[#e11d48] sm:size-[15px]" strokeWidth={0} />
            <MessageCircle className="size-[13px] sm:size-[15px]" strokeWidth={1.8} />
            <Send className="size-[13px] sm:size-[15px]" strokeWidth={1.8} />
            <Bookmark className="ml-auto size-[13px] sm:size-[15px]" strokeWidth={1.8} />
          </div>
          <p className="mt-1 text-[9px] font-bold text-[#1a1a1a] sm:text-[10px]">1,284 likes</p>
          <p className="mt-0.5 truncate text-[9px] leading-snug text-gray-500 sm:text-[10px]">
            <span className="font-semibold text-[#1a1a1a]">aurora.skin</span> the glow routine
            everyone&apos;s asking about ✨
          </p>
        </div>
      </div>

      <CoveragePlatformIconRow logos={ORGANIC_PLATFORMS} />
    </div>
  );
}

/* ---------- Card 3 · Email inbox mockup ---------- */
const EMAIL_ROWS = [
  { name: "Aurora Skin", subject: "🔥 24h only: 20% off everything", time: "9:41", unread: true },
  { name: "Aurora Skin", subject: "You left something behind…", time: "Tue", unread: false },
  { name: "Aurora Skin", subject: "New drop: the summer edit", time: "Mon", unread: false },
];

function EmailInboxMock() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_4px_16px_-6px_rgba(26,26,26,0.14)]">
      <div className="flex shrink-0 items-center justify-between border-b border-black/[0.05] px-3 py-2">
        <span className="text-[11px] font-bold text-[#1a1a1a]">Inbox</span>
        <span className="rounded-full bg-[#e8eef7] px-1.5 py-0.5 text-[8px] font-bold text-[#1e3a8a]">
          3 tracked
        </span>
      </div>
      <ul className="flex min-h-0 flex-1 flex-col justify-center">
        {EMAIL_ROWS.map((row, i) => (
          <li
            key={i}
            className={`flex items-center gap-2.5 px-3 py-2.5 ${i > 0 ? "border-t border-black/[0.04]" : ""} ${row.unread ? "bg-[#f3f7fd]" : ""}`}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#4a7fa5] text-[11px] font-bold text-white">
              A
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="flex items-center gap-1.5">
                {row.unread && (
                  <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-[#2563eb]" />
                )}
                <p
                  className={`truncate text-[10.5px] ${row.unread ? "font-bold text-[#1a1a1a]" : "font-semibold text-[#1a1a1a]/80"}`}
                >
                  {row.name}
                </p>
                <span className="ml-auto shrink-0 text-[9px] text-gray-400">{row.time}</span>
              </div>
              <p
                className={`truncate text-[10px] ${row.unread ? "text-[#1a1a1a]/70" : "text-gray-400"}`}
              >
                {row.subject}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Card 4 · Strategy Map (production flow) ---------- */

/* ---------- Card 5 · Landing page A/B test mockup ---------- */
function LandingTestsMock() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_4px_16px_-6px_rgba(26,26,26,0.14)]">
      <div className="flex shrink-0 items-center justify-between border-b border-black/[0.05] px-3 py-2">
        <span className="text-[11px] font-bold text-[#1a1a1a]">Pricing page</span>
        <span className="text-[9px] text-gray-400">2 variants · 14 ads</span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 p-2.5">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-black/[0.06]">
          <div className="shrink-0 bg-[#f4f4f5] px-2 py-1 text-[8px] font-semibold text-gray-500">Version A</div>
          <div className="min-h-0 flex-1 bg-gradient-to-br from-slate-100 to-slate-200 p-2">
            <div className="h-1.5 w-8 rounded bg-slate-300" />
            <div className="mt-2 h-2 w-full rounded bg-slate-300/80" />
            <div className="mt-1 h-2 w-4/5 rounded bg-slate-300/60" />
            <div className="mt-3 h-4 w-10 rounded bg-slate-400/70" />
          </div>
          <p className="shrink-0 px-2 py-1 text-[8px] text-gray-400">6 ads · 12d avg</p>
        </div>
        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border-2 border-[#95C14B] shadow-[0_0_0_1px_rgba(149,193,75,0.2)]">
          <div className="flex shrink-0 items-center justify-between bg-[#f0fdf4] px-2 py-1">
            <span className="text-[8px] font-semibold text-gray-600">Version B</span>
            <span className="rounded bg-[#95C14B] px-1 py-px text-[7px] font-extrabold text-white">
              WINNING
            </span>
          </div>
          <div className="min-h-0 flex-1 bg-gradient-to-br from-[#ecfdf5] to-[#bbf7d0] p-2">
            <div className="h-1.5 w-10 rounded bg-emerald-400/80" />
            <div className="mt-2 h-2 w-full rounded bg-emerald-300/70" />
            <div className="mt-1 h-2 w-3/4 rounded bg-emerald-300/50" />
            <div className="mt-3 h-4 w-12 rounded bg-[#95C14B]" />
          </div>
          <p className="shrink-0 px-2 py-1 text-[8px] font-semibold text-[#15803d]">8 ads · 34d avg</p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Card 6 · Winners & losers mockup ---------- */
const CREATIVE_ROWS = [
  { label: "Winner", days: 47, tone: "winner" as const, hook: "0% financing - limited time" },
  { label: "Killed", days: 4, tone: "killed" as const, hook: "Free shipping this weekend" },
  { label: "Killed", days: 6, tone: "killed" as const, hook: "Summer glow bundle - 20% off" },
];

function WinnersLosersMock() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_4px_16px_-6px_rgba(26,26,26,0.14)]">
      <div className="flex shrink-0 items-center justify-between border-b border-black/[0.05] px-3 py-2">
        <span className="text-[11px] font-bold text-[#1a1a1a]">Creative test · Meta</span>
        <span className="rounded-full bg-[#ecfdf5] px-1.5 py-0.5 text-[8px] font-bold text-[#15803d]">
          Winner found
        </span>
      </div>
      <ul className="flex min-h-0 flex-1 flex-col justify-center divide-y divide-black/[0.04]">
        {CREATIVE_ROWS.map((row, i) => (
          <li
            key={i}
            className={`flex items-center gap-2.5 px-3 py-2.5 ${row.tone === "killed" ? "opacity-55" : ""}`}
          >
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                row.tone === "winner"
                  ? "bg-gradient-to-br from-[#1e3a5f] to-[#4a7fa5] ring-2 ring-[#95C14B]"
                  : "bg-slate-200"
              }`}
            >
              {row.tone === "winner" ? (
                <Trophy className="size-3.5 text-[#fde047]" strokeWidth={2.25} />
              ) : (
                <span className="text-[8px] font-bold text-slate-500">AD</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[8px] font-extrabold uppercase tracking-wide ${
                    row.tone === "winner" ? "text-[#15803d]" : "text-gray-400"
                  }`}
                >
                  {row.label}
                </span>
                <span className="text-[9px] text-gray-400">{row.days}d</span>
              </div>
              <p
                className={`truncate text-[10px] ${row.tone === "winner" ? "font-semibold text-[#1a1a1a]" : "text-gray-400 line-through"}`}
              >
                {row.hook}
              </p>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${row.tone === "winner" ? "bg-[#95C14B]" : "bg-gray-300"}`}
                  style={{ width: `${Math.min(100, (row.days / 47) * 100)}%` }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const CARD_VISUAL: Record<LandingCoverageCardKey, () => React.ReactNode> = {
  paid: PaidAdMock,
  organic: OrganicPostMock,
  email: EmailInboxMock,
  "strategy-map": LandingStrategyMapMock,
  "landing-tests": LandingTestsMock,
  winners: WinnersLosersMock,
};

const CARD_TINT: Record<LandingCoverageCardKey, string> = {
  paid: "bg-gradient-to-b from-[#eff5fd] to-white",
  organic: "bg-gradient-to-b from-[#fdf0f2] to-white",
  email: "bg-gradient-to-b from-[#eef2f9] to-white",
  "strategy-map": "bg-gradient-to-b from-[#f5f3ff] to-white",
  "landing-tests": "bg-gradient-to-b from-[#fffbeb] to-white",
  winners: "bg-gradient-to-b from-[#ecfdf5] to-white",
};

const CARD_DOT: Record<LandingCoverageCardKey, string> = {
  paid: "bg-[#2563eb]",
  organic: "bg-[#e11d48]",
  email: "bg-[#1e3a8a]",
  "strategy-map": "bg-[#6366f1]",
  "landing-tests": "bg-[#d97706]",
  winners: "bg-[#16a34a]",
};

type Props = {
  copy: LandingCopy["coverage"];
};

function CoverageCard({
  card,
  index,
}: {
  card: { key: LandingCoverageCardKey; title: string; tagline: string };
  index: number;
}) {
  const Visual = CARD_VISUAL[card.key];
  return (
    <LandingScrollReveal delay={index * 0.08} className="h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#e7e5e0] bg-white shadow-[0_1px_3px_rgba(26,26,26,0.05)]">
        <div className={`${COVERAGE_VISUAL_PANEL} ${CARD_TINT[card.key]}`}>
          <div className="h-full w-full min-w-0">
            <Visual />
          </div>
        </div>
        <div className={COVERAGE_FOOTER}>
          <div className="flex items-center gap-2">
            <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${CARD_DOT[card.key]}`} />
            <h3 className="text-base font-bold text-[#1a1a1a]">{card.title}</h3>
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] text-gray-500">{card.tagline}</p>
        </div>
      </article>
    </LandingScrollReveal>
  );
}

function CoverageBridgeText({
  label,
  className = "col-span-3",
}: {
  label: string;
  className?: string;
}) {
  return (
    <p
      className={`${className} py-6 text-center text-sm leading-relaxed text-gray-500 sm:py-8 sm:text-[15px]`}
    >
      {label}
    </p>
  );
}

/** Channels + intelligence features - visual mockups, minimal copy. */
export function LandingCoverage({ copy }: Props) {
  const [channelsGroup, featuresGroup] = copy.groups;
  let mobileCardIndex = 0;

  const renderMobileGroups = () =>
    copy.groups.map((group, groupIndex) => (
      <div key={group.label}>
        {groupIndex > 0 ? (
          <>
            <CoverageBridgeText label={featuresGroup.label} className="mb-2 sm:mb-4" />
            <div className="relative -mx-1 w-[calc(100%+0.5rem)] sm:-mx-2 sm:w-[calc(100%+1rem)]">
              <CoverageDemoVideo revealIndex={mobileCardIndex++} />
            </div>
          </>
        ) : (
          <>
            <p className="mx-auto mb-5 max-w-2xl text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#4a7fa5] sm:mb-6 sm:text-[11px] sm:tracking-[0.14em]">
              {group.label}
            </p>
            <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-3 md:items-stretch">
              {group.cards.map((card) => {
                const index = mobileCardIndex++;
                const isLastSolo =
                  group.cards.length % 3 === 1 && card === group.cards[group.cards.length - 1];
                return (
                  <div key={card.key} className={`h-full ${isLastSolo ? "md:col-start-2" : ""}`}>
                    <CoverageCard card={card} index={index} />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    ));

  const channelsStart = 0;
  const demoRevealIndex = channelsGroup.cards.length;

  return (
    <section className="relative overflow-x-clip px-4 pb-16 pt-8 text-center sm:px-6 sm:pb-24 sm:pt-10">
      <LandingScrollReveal className="mx-auto w-full max-w-6xl">
        <h2 className={landingSectionHeadlineClasses}>
          {copy.titleLine1}
          <br />
          <LandingHeadlineHighlight>{copy.titleHighlight}</LandingHeadlineHighlight>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
          {copy.subtitle}
        </p>

        <div className="mt-12 space-y-12 text-left sm:mt-14 md:hidden">{renderMobileGroups()}</div>

        <div className="mt-12 hidden md:mt-14 md:block">
          <div className="mx-auto w-full max-w-[min(88rem,calc(100vw-1.5rem))] px-2 sm:px-4">
            <p className="mb-6 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-[#4a7fa5]">
              {channelsGroup.label}
            </p>

            <div className="grid grid-cols-3 gap-x-6 text-left">
              {channelsGroup.cards.map((card, i) => (
                <div key={card.key} className="h-full">
                  <CoverageCard card={card} index={channelsStart + i} />
                </div>
              ))}

              <CoverageBridgeText label={featuresGroup.label} />

              <div className="col-span-3 -mt-1">
                <CoverageDemoVideo revealIndex={demoRevealIndex} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 flex justify-center sm:mt-16">
          <LandingContactCta size="md" trailingArrow />
        </div>
      </LandingScrollReveal>
    </section>
  );
}
