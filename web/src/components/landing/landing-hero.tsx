import Image from "next/image";
import Link from "next/link";
import { HeroHeadline } from "@/components/landing/hero-headline";
import { LandingBrandMarquee } from "@/components/landing/landing-brand-marquee";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import { ProgressiveRivalVideoBackdrop } from "@/components/ui/progressive-rival-video-backdrop";
import { glassPillShellClass } from "@/components/ui/glass-styles";
import {
  MetaLogo,
  GoogleLogo,
  TikTokLogo,
  LinkedInLogo,
  SnapchatLogo,
  PinterestLogo,
} from "@/components/platform-logos";
import type { LandingCopy } from "@/lib/i18n/landing/types";

function PlatformIconCircle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex size-14 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_4px_14px_rgba(26,26,26,0.08),0_1px_3px_rgba(26,26,26,0.06)] sm:size-16 md:size-[4.5rem] ${className}`.trim()}
    >
      {children}
    </div>
  );
}

const FAN_GUTTER_VB = 24;
const FAN_CELL_VB = (1000 - 5 * FAN_GUTTER_VB) / 6;
const PLATFORM_FAN_EX: readonly number[] = Array.from({ length: 6 }, (_, i) =>
  Math.round(i * (FAN_CELL_VB + FAN_GUTTER_VB) + FAN_CELL_VB / 2),
);
const FAN_ORIGIN = { x: 500, y: 22 };
const FAN_END_Y = 196;

const HERO_REVIEW_AVATARS = [
  "/landing/hero-review-1.webp",
  "/landing/hero-review-2.webp",
  "/landing/hero-review-3.webp",
  "/landing/hero-review-4.webp",
] as const;

type Props = {
  copy: LandingCopy["hero"];
};

export function LandingHero({ copy }: Props) {
  const platforms = [
    {
      name: "Meta",
      icon: <MetaLogo className="mx-auto block h-[22px] w-[34px]" />,
    },
    {
      name: "Google",
      icon: <GoogleLogo className="mx-auto block h-[26px] w-[26px]" />,
    },
    {
      name: "TikTok",
      icon: <TikTokLogo className="mx-auto block h-[24px] w-[22px]" />,
    },
    {
      name: "LinkedIn",
      icon: <LinkedInLogo className="mx-auto block h-[22px] w-[22px]" />,
    },
    {
      name: "Snapchat",
      icon: <SnapchatLogo className="mx-auto block size-8" />,
    },
    {
      name: "Pinterest",
      icon: <PinterestLogo className="mx-auto block size-[26px]" />,
    },
  ];

  return (
    <section className="relative isolate overflow-x-clip pb-8 pt-28 text-center sm:pb-10 sm:pt-[calc(5.5rem+3.75rem)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 left-1/2 z-0 w-screen max-w-[100vw] -translate-x-1/2"
      >
        <ProgressiveRivalVideoBackdrop footerTint="light" className="h-full min-h-full" />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 left-1/2 z-[1] h-[min(48vh,460px)] w-screen max-w-[100vw] -translate-x-1/2 bg-gradient-to-b from-transparent from-[12%] via-white/80 via-[62%] to-white"
      />

      <div className="landing-hero-copy-zone landing-hero-copy-zone--control">
        <HeroHeadline headline={copy.headline} variant="control" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="relative mx-auto w-full max-w-5xl overflow-hidden sm:overflow-visible">
          <div className="relative z-20 flex justify-center px-4">
            <LandingTrialCta href="/onboarding" size="hero">
              {copy.trialCta}
            </LandingTrialCta>
          </div>

          <div className="relative z-[5] mx-auto w-full max-w-[56rem] px-1 sm:px-6 md:px-8 lg:px-10">
            <div className="relative -mt-1 hidden w-full max-w-full overflow-visible [aspect-ratio:1000/240] sm:block">
              <svg
                className="absolute inset-0 h-full w-full text-[#bfbfbf]"
                viewBox="0 0 1000 240"
                fill="none"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden
              >
                {PLATFORM_FAN_EX.map((ex, i) => {
                  const dx = ex - FAN_ORIGIN.x;
                  const side = dx === 0 ? 0 : dx > 0 ? 1 : -1;
                  const spread = Math.min(1, Math.abs(dx) / 430);
                  const c1x = FAN_ORIGIN.x + dx * (0.14 + spread * 0.1);
                  const c1y = 58;
                  const c2x = ex - side * (18 + (1 - spread) * 12);
                  const c2y = 138;
                  return (
                    <path
                      key={i}
                      d={`M ${FAN_ORIGIN.x} ${FAN_ORIGIN.y} C ${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${FAN_END_Y}`}
                      stroke="currentColor"
                      strokeWidth="1.65"
                      strokeDasharray="4 6"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </svg>
            </div>

            <div className="relative z-10 mt-7 overflow-hidden pb-3 sm:-mt-2 sm:overflow-visible sm:pb-4">
              <div className="mx-auto grid w-full max-w-[22rem] grid-cols-3 gap-x-3 gap-y-5 sm:max-w-none sm:grid-cols-6 sm:gap-x-6 md:gap-x-7">
                {platforms.map(({ name, icon }) => (
                  <Link
                    key={name}
                    href="/onboarding"
                    aria-label={copy.platformTrialAria.replace("{platform}", name)}
                    className="group flex min-w-0 flex-col items-center gap-2.5 rounded-lg pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a7fa5] focus-visible:ring-offset-2"
                  >
                    <PlatformIconCircle className="transition-transform duration-200 group-hover:scale-105 group-hover:shadow-[0_6px_18px_rgba(26,26,26,0.12),0_2px_4px_rgba(26,26,26,0.08)]">
                      {icon}
                    </PlatformIconCircle>
                    <span className="max-w-[5.5rem] text-center text-xs font-medium leading-snug text-gray-600 sm:max-w-none sm:text-sm">
                      {name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <LandingBrandMarquee embedded ariaLabel={copy.brandMarqueeAria} label={copy.brandMarqueeLabel} />

      <div className="relative z-10 mx-auto mt-16 flex justify-center px-4 sm:mt-[4.5rem] md:mt-24 sm:px-6">
        <div
          className={`${glassPillShellClass} inline-flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full py-2 pl-2.5 pr-5`}
          aria-label={copy.marketersPillAria}
        >
          <div className="flex shrink-0 items-center ps-1" aria-hidden>
            {HERO_REVIEW_AVATARS.map((src, i) => (
              <div
                key={src}
                className={`relative size-9 shrink-0 overflow-hidden rounded-full ring-2 ring-white ${i > 0 ? "-ml-2.5" : ""}`}
              >
                <Image
                  src={src}
                  alt=""
                  width={72}
                  height={72}
                  loading="lazy"
                  className="size-full object-cover"
                  sizes="36px"
                />
              </div>
            ))}
          </div>
          <p className="min-w-0 text-left text-sm leading-tight text-[#1a1a1a]">
            <span className="font-semibold">{copy.marketersPill}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
