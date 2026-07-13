import type { ReactNode } from "react";
import { Check, Clock3, FileSpreadsheet, HelpCircle, KeyRound, LayoutGrid, X } from "lucide-react";

import {
  LandingHeadlineHighlight,
  landingSectionHeadlineClasses,
} from "@/components/landing/landing-headline-highlight";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { LandingContactCta } from "@/components/landing/landing-contact-provider";
import {
  GoogleLogo,
  LinkedInLogo,
  MetaLogo,
  PinterestLogo,
  SnapchatLogo,
  TikTokLogo,
} from "@/components/platform-logos";
import { LandingCapabilityTiles } from "@/components/landing/landing-capability-tiles";
import { RivalLogoImg } from "@/components/rival-logo";
import { stackToolIcon } from "@/components/landing/stack-tool-icons";
import { fillCopyTemplate } from "@/lib/i18n/fill-copy-template";
import type { LandingCopy } from "@/lib/i18n/landing/types";

const withoutRivalGlassCardClass =
  "rounded-[1.75rem] border border-[#ef4444]/28 bg-[#fff5f5]/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_16px_48px_-20px_rgba(239,68,68,0.22)] backdrop-blur-2xl backdrop-saturate-[1.45] ring-1 ring-[#ef4444]/12";

const rivalGlassCardClass =
  "rounded-[1.75rem] border-2 border-[#4a7fa5]/45 bg-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_28px_72px_-20px_rgba(74,127,165,0.42),0_0_0_1px_rgba(255,255,255,0.6)_inset] backdrop-blur-[28px] backdrop-saturate-[1.5] ring-1 ring-[#4a7fa5]/15";

const PLATFORM_ICONS: Record<string, ReactNode> = {
  Meta: <MetaLogo className="mx-auto block h-[14px] w-[22px]" />,
  Google: <GoogleLogo className="mx-auto block h-4 w-4" />,
  TikTok: <TikTokLogo className="mx-auto block h-[15px] w-[14px]" />,
  LinkedIn: <LinkedInLogo className="mx-auto block h-[14px] w-[14px]" />,
  Snapchat: <SnapchatLogo className="mx-auto block size-[18px]" />,
  Pinterest: <PinterestLogo className="mx-auto block size-[15px]" />,
};

const PAIN_CHIP_ICONS = [FileSpreadsheet, LayoutGrid, HelpCircle] as const;

function StackToolIconTile({
  name,
  iconClass,
  iconBg,
  iconKey,
  compact = false,
}: LandingCopy["stackReplacement"]["stackTools"][number] & { compact?: boolean }) {
  const Icon = stackToolIcon({ name, iconClass, iconBg, iconKey });
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-[#ef4444]/25 bg-white/75 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.94)] backdrop-blur-md ${
        compact ? "gap-1 px-1 py-2" : "gap-2 px-2 py-3 sm:py-3.5"
      }`}
      title={name}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-xl ${iconBg} ${
          compact ? "size-8 rounded-lg" : "size-11 sm:size-12"
        }`}
      >
        <Icon
          className={`${iconClass} ${compact ? "size-3.5" : "size-5 sm:size-[22px]"}`}
          strokeWidth={2.25}
          aria-hidden
        />
      </span>
      <span
        className={`line-clamp-2 font-semibold leading-tight text-[#1a1a1a] ${
          compact ? "text-[8px]" : "text-[10px] sm:text-[11px]"
        }`}
      >
        {name}
      </span>
    </div>
  );
}

function WithoutStatPill({
  value,
  icon: Icon,
  label,
  compact = false,
}: {
  value: string;
  icon: typeof KeyRound;
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-[#ef4444]/20 bg-white/70 text-center ${
        compact ? "px-1.5 py-2" : "px-3 py-3 sm:py-3.5"
      }`}
    >
      <Icon className={`text-[#ef4444] ${compact ? "size-3.5" : "size-4"}`} strokeWidth={2.25} aria-hidden />
      <p className={`mt-1 font-bold leading-none text-[#dc2626] ${compact ? "text-lg" : "text-2xl sm:text-[1.75rem]"}`}>
        {value}
      </p>
      <p className={`mt-0.5 font-semibold uppercase tracking-[0.08em] text-[#b91c1c] ${compact ? "text-[8px]" : "text-[9px] sm:text-[10px]"}`}>
        {label}
      </p>
    </div>
  );
}

function WithoutPainChips({
  points,
  compact = false,
}: {
  points: string[];
  compact?: boolean;
}) {
  return (
    <div className={`grid grid-cols-3 ${compact ? "gap-1.5" : "gap-2 sm:gap-2.5"}`}>
      {points.map((point, index) => {
        const Icon = PAIN_CHIP_ICONS[index] ?? HelpCircle;
        return (
          <div
            key={point}
            className={`flex flex-col items-center rounded-xl border border-[#ef4444]/15 bg-[#fef2f2]/55 text-center ${
              compact ? "gap-1 px-1.5 py-2" : "gap-1.5 px-2 py-2.5 sm:px-2.5 sm:py-3"
            }`}
          >
            <span
              className={`flex items-center justify-center rounded-full bg-[#ef4444]/10 ring-1 ring-[#ef4444]/20 ${
                compact ? "size-6" : "size-7 sm:size-8"
              }`}
            >
              <Icon className={`text-[#ef4444] ${compact ? "size-3" : "size-3.5 sm:size-4"}`} strokeWidth={2.5} aria-hidden />
            </span>
            <span className={`font-semibold leading-tight text-[#991b1b] ${compact ? "text-[9px]" : "text-[10px] sm:text-[11px]"}`}>
              {point}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function WithRivalPriceHero({ copy, compact = false }: { copy: LandingCopy["stackReplacement"]; compact?: boolean }) {
  return (
    <div
      className={`rounded-2xl border-2 border-[#4a7fa5]/35 bg-gradient-to-b from-[#eff6ff] via-white to-[#dbeafe]/60 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_14px_36px_-12px_rgba(74,127,165,0.4)] ring-1 ring-[#4a7fa5]/10 ${
        compact ? "px-3 py-3" : "px-4 py-4 sm:px-5 sm:py-5"
      }`}
    >
      <p
        className={`font-bold uppercase tracking-[0.12em] text-[#2563eb] ${
          compact ? "text-[9px]" : "text-[10px] sm:text-[11px]"
        }`}
      >
        {copy.onePlanLabel}
      </p>
      <p
        className={`mt-1 font-bold leading-none tracking-tight text-[#0f172a] ${
          compact ? "text-3xl" : "text-[2.75rem] sm:text-5xl"
        }`}
      >
        {copy.price}
        <span className={`font-bold text-[#2563eb] ${compact ? "text-xl" : "text-2xl sm:text-4xl"}`}>
          {copy.priceSuffix}
        </span>
      </p>
      <p className={`mt-1 font-semibold text-[#4a7fa5] ${compact ? "text-[10px]" : "text-xs sm:text-sm"}`}>
        {copy.zeroGlue}
      </p>
      <div
        className={`mt-2 flex flex-wrap items-center justify-center gap-1.5 border-t border-[#4a7fa5]/15 ${
          compact ? "pt-2" : "pt-3"
        }`}
      >
        <span className="rounded-full border border-[#95C14B]/45 bg-[#ecfccb] px-2.5 py-0.5 text-[9px] font-bold text-[#3f6212] sm:text-[10px]">
          {compact ? copy.saveSubMobile : copy.saveLabel}
        </span>
        {!compact ? <span className="text-[11px] text-[#5a7f2e]/90 sm:text-xs">{copy.saveSub}</span> : null}
      </div>
    </div>
  );
}

function WithoutCostHero({ copy, compact = false }: { copy: LandingCopy["stackReplacement"]; compact?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-[#ef4444]/25 bg-gradient-to-b from-[#fff1f2] to-[#fef2f2]/80 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ${
        compact ? "px-3 py-2.5" : "px-4 py-4 sm:px-5 sm:py-5"
      }`}
    >
      <p className={`font-bold uppercase tracking-[0.12em] text-[#b91c1c] ${compact ? "text-[9px]" : "text-[10px] sm:text-[11px]"}`}>
        {copy.payTodayLabel}
      </p>
      <p className={`mt-1 font-bold leading-none tracking-tight text-[#dc2626] ${compact ? "text-3xl" : "text-[2.75rem] sm:text-5xl"}`}>
        {copy.payTodayAmount}
      </p>
      <p className={`mt-1 font-semibold text-[#991b1b]/90 ${compact ? "text-[10px]" : "text-xs sm:text-sm"}`}>{copy.payTodaySub}</p>
      <div
        className={`mt-2 flex flex-wrap items-center justify-center gap-1.5 border-t border-[#ef4444]/15 text-[#991b1b] ${
          compact ? "pt-2 text-[9px]" : "pt-3 text-[11px] sm:text-xs"
        }`}
      >
        <span className="rounded-full bg-[#ef4444]/10 px-2 py-0.5 font-bold">{copy.payTodayFooter}</span>
        <span className="text-[#b91c1c]/85">{copy.payTodayFooterSub}</span>
      </div>
    </div>
  );
}

function WithoutRivalCard({ copy }: { copy: LandingCopy["stackReplacement"] }) {
  const toolCount = String(copy.stackTools.length);

  return (
    <article className={`relative flex h-full flex-col overflow-hidden ${withoutRivalGlassCardClass} p-5 sm:p-7`}>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#ef4444]/16 blur-3xl"
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
          <div>
            <h3 className="text-xl font-bold text-[#1a1a1a]">{copy.withoutTitle}</h3>
            <p className="mt-0.5 text-sm text-[#7f1d1d]/90">{copy.withoutIntro}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-[#ef4444]/30 bg-[#ef4444]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#b91c1c]">
          {copy.withoutBadge}
        </span>
      </header>

      <div className="relative mt-5 flex flex-1 flex-col gap-5">
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          <WithoutStatPill value={toolCount} icon={LayoutGrid} label={copy.withoutStatTools} />
          <WithoutStatPill value={toolCount} icon={KeyRound} label={copy.withoutStatLogins} />
          <WithoutStatPill value="4h" icon={Clock3} label={copy.withoutStatGlue} />
        </div>

        <div className="rounded-2xl border border-dashed border-[#ef4444]/30 bg-white/40 px-3 py-4 sm:px-4 sm:py-5">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#b91c1c] sm:text-[11px]">
            {fillCopyTemplate(copy.toolsSummaryMobile, { count: copy.stackTools.length })}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-2.5">
            {copy.stackTools.map((tool) => (
              <StackToolIconTile key={tool.name} {...tool} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2.5 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#b91c1c] sm:text-[11px]">
            {copy.manualLabel}
          </p>
          <WithoutPainChips points={copy.painPoints} />
        </div>

        <div className="mt-auto">
          <WithoutCostHero copy={copy} />
        </div>
      </div>
    </article>
  );
}

function WithoutRivalCardMobile({ copy }: { copy: LandingCopy["stackReplacement"] }) {
  const toolCount = String(copy.stackTools.length);

  return (
    <article className={`relative overflow-hidden ${withoutRivalGlassCardClass} p-3.5`}>
      <header className="relative flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#ef4444]/14 ring-1 ring-[#ef4444]/28">
            <X className="size-3.5 text-[#ef4444]" strokeWidth={2.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#1a1a1a]">{copy.withoutTitle}</h3>
            <p className="text-[10px] leading-snug text-[#7f1d1d]/90">{copy.withoutIntroMobile}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-[#ef4444]/30 bg-[#ef4444]/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-[#b91c1c]">
          {copy.withoutBadge}
        </span>
      </header>

      <div className="relative mt-3 grid grid-cols-3 gap-1.5">
        <WithoutStatPill value={toolCount} icon={LayoutGrid} label={copy.withoutStatTools} compact />
        <WithoutStatPill value={toolCount} icon={KeyRound} label={copy.withoutStatLogins} compact />
        <WithoutStatPill value="4h" icon={Clock3} label={copy.withoutStatGlue} compact />
      </div>

      <div className="relative mt-3 rounded-xl border border-dashed border-[#ef4444]/30 bg-white/40 px-2 py-2.5">
        <div className="grid grid-cols-3 gap-1.5">
          {copy.stackTools.map((tool) => (
            <StackToolIconTile key={tool.name} {...tool} compact />
          ))}
        </div>
      </div>

      <div className="relative mt-3">
        <WithoutPainChips points={copy.painPointsMobile} compact />
      </div>

      <div className="relative mt-3">
        <WithoutCostHero copy={copy} compact />
      </div>
    </article>
  );
}

function WithRivalPlatformStrip({ copy }: { copy: LandingCopy["stackReplacement"] }) {
  return (
    <div className="mt-6 rounded-2xl border border-white/75 bg-white/50 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-md sm:px-5 sm:py-5">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-[#4a7fa5]">{copy.platformsLabel}</p>
      <div className="mt-3.5 grid grid-cols-3 gap-2.5 sm:grid-cols-6 sm:gap-2">
        {copy.platforms.map((platform) => (
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

function WithRivalPlatformStripMobile({ copy }: { copy: LandingCopy["stackReplacement"] }) {
  return (
    <div className="mt-3 rounded-xl border border-white/75 bg-white/50 px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-md">
      <p className="text-center text-[9px] font-bold uppercase tracking-[0.1em] text-[#4a7fa5]">{copy.platformsLabelMobile}</p>
      <div className="mt-2 grid grid-cols-6 gap-1">
        {copy.platforms.map((platform) => (
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

/** Desktop - unchanged. */
function WithRivalCard({ copy }: { copy: LandingCopy["stackReplacement"] }) {
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
          <h3 className="text-xl font-bold text-[#1a1a1a]">{copy.withTitle}</h3>
        </header>

        <div className="mt-6 flex justify-center">
          <div className="rounded-2xl border border-white/75 bg-white/55 px-10 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_32px_-12px_rgba(74,127,165,0.25)] backdrop-blur-xl sm:px-12 sm:py-6">
            <RivalLogoImg className="mx-auto h-11 w-auto max-w-[180px] object-contain sm:h-12" />
          </div>
        </div>

        <WithRivalPlatformStrip copy={copy} />

        <LandingCapabilityTiles
          variant="hero"
          label={copy.capabilitiesLabel}
          tiles={copy.capabilities}
          className="mt-6 sm:mt-7"
        />

        <div className="mt-auto space-y-4 pt-6 sm:space-y-5 sm:pt-7">
          <WithRivalPriceHero copy={copy} />

          <LandingContactCta size="lg" trailingArrow />
        </div>
      </div>
    </article>
  );
}

/** Mobile-only compact card. */
function WithRivalCardMobile({ copy }: { copy: LandingCopy["stackReplacement"] }) {
  return (
    <article className={`relative flex flex-col ${rivalGlassCardClass} p-3.5`}>
      <header className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#4a7fa5]/12 ring-1 ring-[#4a7fa5]/30">
            <Check className="size-3.5 text-[#4a7fa5]" strokeWidth={3} aria-hidden />
          </span>
          <h3 className="text-base font-bold text-[#1a1a1a]">{copy.withTitle}</h3>
        </div>
        <RivalLogoImg className="h-5 w-auto max-w-[72px] shrink-0 object-contain" />
      </header>

      <div className="mt-3">
        <WithRivalPriceHero copy={copy} compact />
      </div>

      <WithRivalPlatformStripMobile copy={copy} />

      <LandingCapabilityTiles
        variant="hero"
        label={copy.capabilitiesLabel}
        tiles={copy.capabilities}
        compact
        className="mt-3"
      />

      <div className="mt-3">
        <LandingContactCta size="lg" trailingArrow className="w-full" />
      </div>
    </article>
  );
}

type Props = {
  copy: LandingCopy["stackReplacement"];
};

export function LandingStackReplacement({ copy }: Props) {
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
          <h2 className={landingSectionHeadlineClasses}>
            {copy.titlePrefix}
            <LandingHeadlineHighlight>{copy.titleHighlight}</LandingHeadlineHighlight>
            {copy.titleSuffix}
          </h2>
        </div>

        <div className="relative mt-10 sm:mt-14 lg:mt-16">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 hidden size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/75 text-xs font-bold uppercase tracking-[0.18em] text-[#4a7fa5] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_32px_-8px_rgba(74,127,165,0.35)] backdrop-blur-xl lg:flex"
          >
            {copy.vs}
          </div>

          {/* Mobile-only compact stack */}
          <div className="flex flex-col gap-3 md:hidden">
            <WithoutRivalCardMobile copy={copy} />
            <div className="flex justify-center" aria-hidden>
              <span className="inline-flex size-9 items-center justify-center rounded-full border border-white/80 bg-white/75 text-[9px] font-bold uppercase tracking-[0.16em] text-[#4a7fa5] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_6px_18px_-6px_rgba(74,127,165,0.3)] backdrop-blur-xl">
                {copy.vs}
              </span>
            </div>
            <WithRivalCardMobile copy={copy} />
          </div>

          {/* Desktop - unchanged side-by-side layout */}
          <div className="hidden flex-col gap-6 md:flex lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-8">
            <WithoutRivalCard copy={copy} />
            <div className="flex justify-center lg:hidden" aria-hidden>
              <span className="inline-flex size-12 items-center justify-center rounded-full border border-white/80 bg-white/75 text-[10px] font-bold uppercase tracking-[0.18em] text-[#4a7fa5] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_24px_-8px_rgba(74,127,165,0.3)] backdrop-blur-xl">
                {copy.vs}
              </span>
            </div>
            <WithRivalCard copy={copy} />
          </div>
        </div>
      </LandingScrollReveal>
    </section>
  );
}
