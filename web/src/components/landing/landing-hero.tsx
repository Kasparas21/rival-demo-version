import Image from "next/image";
import { Star } from "lucide-react";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";
import { LandingSpySearchBar } from "@/components/landing/landing-spy-search-bar";
import { RivalVideoBackdrop } from "@/components/ui/rival-video-shell";
import { glassPillShellClass } from "@/components/ui/glass-styles";
import {
  MetaLogo,
  GoogleLogo,
  TikTokLogo,
  LinkedInLogo,
  SnapchatLogo,
  RedditLogo,
} from "@/components/platform-logos";

function PlatformIconCircle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex size-[4.25rem] shrink-0 items-center justify-center rounded-full bg-white shadow-[0_4px_14px_rgba(26,26,26,0.08),0_1px_3px_rgba(26,26,26,0.06)] sm:size-16 md:size-[4.5rem]">
      {children}
    </div>
  );
}

/** Column centers in viewBox units: 6 equal tracks + 5 gutters (matches `gap-x-5`…`gap-x-7` scale). */
const FAN_GUTTER_VB = 24;
const FAN_CELL_VB = (1000 - 5 * FAN_GUTTER_VB) / 6;
const PLATFORM_FAN_EX: readonly number[] = Array.from({ length: 6 }, (_, i) =>
  Math.round(i * (FAN_CELL_VB + FAN_GUTTER_VB) + FAN_CELL_VB / 2),
);
/** End just above icon tops; higher viewBox leaves air so dashes don’t stack on discs */
const FAN_ORIGIN = { x: 500, y: 22 };
const FAN_END_Y = 196;

const HERO_REVIEW_AVATARS = [
  "/landing/hero-review-1.png",
  "/landing/hero-review-2.png",
  "/landing/hero-review-3.png",
  "/landing/hero-review-4.png",
] as const;

export function LandingHero() {
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
      name: "Reddit",
      icon: <RedditLogo className="mx-auto block size-[26px]" />,
    },
  ];

  return (
    <section className="relative isolate overflow-hidden pb-28 pt-[calc(4.875rem+3.75rem)] text-center sm:pt-[calc(5.5rem+3.75rem)]">
      {/* Same stack as `/login` (RivalVideoShell): full-bleed, including behind the fixed header */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 left-1/2 z-0 w-screen max-w-[100vw] -translate-x-1/2"
      >
        <RivalVideoBackdrop footerTint="light" className="h-full min-h-full" />
      </div>

      {/* Soft fade into the solid white Features section */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 left-1/2 z-[1] h-[min(46vh,460px)] w-screen max-w-[100vw] -translate-x-1/2 bg-gradient-to-b from-transparent via-white/[0.55] via-[45%] to-white"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <h1
          id="how-it-works"
          className={`${landingNavAnchorScrollClasses} mb-8 text-7xl font-extrabold leading-tight text-[#1a1a1a]`}
        >
          Spy your
          <br />
          competitor
          <br />
          on{" "}
          <span className="font-serif font-normal italic">all platforms</span>
        </h1>

        <div className="relative mx-auto w-full max-w-5xl overflow-visible">
          <div className="relative z-20 mx-auto max-w-2xl">
            <LandingSpySearchBar inputId="competitor-domain" />
          </div>

          <div className="relative z-[5] mx-auto w-full max-w-[56rem] px-4 sm:px-6 md:px-8 lg:px-10">
            {/* Aspect matches viewBox so horizontal positions line up with the icon grid */}
            <div className="relative -mt-1 w-full max-w-full overflow-visible [aspect-ratio:1000/240]">
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

            <div className="relative z-10 -mt-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] sm:overflow-visible">
              <div className="mx-auto grid w-full min-w-[320px] grid-cols-6 gap-x-5 sm:min-w-0 sm:gap-x-6 md:gap-x-7">
                {platforms.map(({ name, icon }) => (
                  <div key={name} className="flex min-w-0 flex-col items-center gap-2.5 pt-1">
                    <PlatformIconCircle>{icon}</PlatformIconCircle>
                    <span className="max-w-[5.5rem] text-center text-xs font-medium leading-snug text-gray-600 sm:max-w-none sm:text-sm">
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 mx-auto mt-12 flex justify-center sm:mt-14 md:mt-16">
              <div
                className={`${glassPillShellClass} inline-flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full py-2 pl-2.5 pr-5`}
                aria-label="4.9 out of 5 from 4,268 customers"
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
                        className="size-full object-cover"
                        sizes="36px"
                      />
                    </div>
                  ))}
                </div>
                <Star
                  className="size-[1.125rem] shrink-0 fill-amber-400 text-amber-400"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <p className="min-w-0 text-left text-sm leading-tight text-[#1a1a1a]">
                  <span className="font-semibold">4.9/5</span>{" "}
                  <span className="font-normal text-gray-700">from</span>{" "}
                  <span className="font-semibold">4,268</span>{" "}
                  <span className="font-normal text-gray-700">customers</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
