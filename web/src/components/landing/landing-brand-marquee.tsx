"use client";

import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import LogoLoop, { type LogoImgItem, type LogoItem } from "@/components/ui/logo-loop";

type MarqueeLogo = LogoImgItem & { brandName: string };

const MARQUEE_LOGO_DIR = "/landing/brands/marquee/svg";

const MARQUEE_LOGOS_LIST: MarqueeLogo[] = [
  {
    src: `${MARQUEE_LOGO_DIR}/desenio.svg`,
    brandName: "Desenio",
    alt: "Desenio logo",
    width: 3305,
    height: 337,
  },
  {
    src: `${MARQUEE_LOGO_DIR}/nocco.svg`,
    brandName: "NOCCO",
    alt: "NOCCO logo",
    width: 1280,
    height: 1063,
  },
  {
    src: `${MARQUEE_LOGO_DIR}/na-kd.svg`,
    brandName: "NA-KD",
    alt: "NA-KD logo",
    width: 3840,
    height: 776,
  },
  {
    src: `${MARQUEE_LOGO_DIR}/castore.svg`,
    brandName: "Castore",
    alt: "Castore logo",
    width: 2500,
    height: 2065,
  },
  {
    src: `${MARQUEE_LOGO_DIR}/kind.svg`,
    brandName: "Kind",
    alt: "Kind logo",
    width: 256,
    height: 256,
  },
  {
    src: `${MARQUEE_LOGO_DIR}/foodspring.svg`,
    brandName: "foodspring",
    alt: "foodspring logo",
    width: 1920,
    height: 585,
  },
  {
    src: `${MARQUEE_LOGO_DIR}/manucurist.svg`,
    brandName: "manucurist",
    alt: "manucurist Paris logo",
    width: 1182,
    height: 329,
  },
];

const MARQUEE_LOGOS = MARQUEE_LOGOS_LIST satisfies LogoItem[];

function stripImgClass() {
  return "!h-[var(--landing-marquee-slide-h)] w-auto max-w-[min(72vw,420px)] object-contain opacity-80 grayscale [image-rendering:auto]";
}

type MarqueeProps = {
  embedded?: boolean;
  ariaLabel?: string;
  label?: string;
};

/** Infinite logo strip — soft white gradient edges, subtle logos. */
export function LandingBrandMarquee({
  embedded = false,
  ariaLabel = "Brands and sectors Rival understands",
}: MarqueeProps) {
  const track = (
    <div className="relative z-[1] min-h-[var(--landing-marquee-slide-h)] opacity-50 [&_img]:pointer-events-none">
      <div className="motion-reduce:block hidden py-1 sm:py-1.5">
        <ul className="flex flex-col items-center gap-6 px-4 sm:gap-7" role="list">
          {MARQUEE_LOGOS_LIST.map((entry) => (
            <li key={entry.src} className="flex w-full justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- LogoLoop measures intrinsic img layout */}
              <img
                src={entry.src}
                alt={entry.alt}
                width={entry.width}
                height={entry.height}
                className={`${stripImgClass()} max-h-[min(120px,24vh)] w-auto max-w-full`}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="motion-reduce:hidden min-h-[var(--landing-marquee-slide-h)] w-full">
        <LogoLoop
          logos={MARQUEE_LOGOS}
          speed={96}
          direction="left"
          logoHeight={32}
          gap={44}
          hoverSpeed={12}
          fadeOut
          fadeOutColor="#ffffff"
          ariaLabel={ariaLabel}
          className="w-full"
          renderItem={(item) =>
            "node" in item ? (
              <span className="inline-flex shrink-0 items-center text-black/70">{item.node}</span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- LogoLoop measures intrinsic img layout
              <img
                src={item.src}
                alt={item.alt ?? ""}
                width={item.width}
                height={item.height}
                srcSet={item.srcSet}
                sizes={item.sizes}
                loading="lazy"
                decoding="async"
                draggable={false}
                className={stripImgClass()}
              />
            )
          }
        />
      </div>
    </div>
  );

  return (
    <section
      className={
        embedded
          ? "relative z-10 w-full overflow-hidden py-2 [--landing-marquee-slide-h:22px] sm:py-3 sm:[--landing-marquee-slide-h:28px] md:[--landing-marquee-slide-h:32px]"
          : "relative isolate z-10 -mt-8 overflow-hidden pb-8 pt-10 [--landing-marquee-slide-h:24px] sm:-mt-10 sm:pb-10 sm:pt-12 sm:[--landing-marquee-slide-h:28px] md:[--landing-marquee-slide-h:32px]"
      }
      aria-label={ariaLabel}
    >
      {!embedded ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white from-0% via-white via-[38%] via-white via-[62%] to-[#f7fbff] to-100%"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-px h-14 bg-gradient-to-b from-white via-white/95 to-transparent sm:h-16"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent via-white/35 to-[#f7fbff] sm:h-24"
          />
        </>
      ) : null}

      {embedded ? track : <LandingScrollReveal>{track}</LandingScrollReveal>}
    </section>
  );
}
