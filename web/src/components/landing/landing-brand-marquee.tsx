"use client";

import LogoLoop, { type LogoImgItem, type LogoItem, type LogoNodeItem } from "@/components/ui/logo-loop";

const wordmarkSvgClass =
  "block h-[var(--landing-marquee-slide-h)] w-auto max-w-[min(92vw,720px)] shrink-0 text-black";

function MarqueeFoodspringMark() {
  return (
    <svg viewBox="0 0 520 80" className={wordmarkSvgClass} fill="none" aria-hidden>
      <text
        x={8}
        y={56}
        fill="currentColor"
        style={{
          fontFamily:
            "ui-rounded, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: 48,
          fontWeight: 600,
          letterSpacing: "-0.03em",
        }}
      >
        foodspring
      </text>
      <text
        x={396}
        y={28}
        fill="currentColor"
        style={{
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        {"\u00AE"}
      </text>
    </svg>
  );
}

function MarqueeNoccoMark() {
  return (
    <svg viewBox="0 0 340 260" className={wordmarkSvgClass} fill="none" aria-hidden>
      <g transform="skewX(-8)">
        <rect x={48} y={36} width={220} height={26} rx={3} fill="currentColor" />
        <rect x={48} y={78} width={220} height={26} rx={3} fill="currentColor" />
      </g>
      <text
        x={170}
        y={232}
        textAnchor="middle"
        fill="currentColor"
        style={{
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: 72,
          fontWeight: 800,
          letterSpacing: "-0.06em",
        }}
      >
        NOCCO
      </text>
    </svg>
  );
}

function MarqueePipedriveMark() {
  return (
    <svg viewBox="0 0 520 88" className={wordmarkSvgClass} fill="none" aria-hidden>
      <text
        x={8}
        y={60}
        fill="currentColor"
        style={{
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: 52,
          fontWeight: 700,
          letterSpacing: "-0.03em",
        }}
      >
        pipedrive
      </text>
      <text
        x={412}
        y={34}
        fill="currentColor"
        style={{
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {"\u2122"}
      </text>
    </svg>
  );
}

const STRIP_LOGOS: LogoImgItem[] = [
  {
    src: "/landing/brands/marquee/crypto-partners.png",
    alt: "Crypto and blockchain platforms",
    width: 1024,
    height: 285,
  },
  {
    src: "/landing/brands/marquee/payments-partners.png",
    alt: "Payment methods and wallets",
    width: 1024,
    height: 104,
  },
  {
    src: "/landing/brands/marquee/automotive-partners.png",
    alt: "Automotive brands",
    width: 1024,
    height: 206,
  },
  {
    src: "/landing/brands/marquee/real-estate-partners.png",
    alt: "Real estate networks",
    width: 1024,
    height: 845,
  },
];

const WORDMARK_LOGOS: LogoNodeItem[] = [
  { node: <MarqueeFoodspringMark />, title: "Foodspring", ariaLabel: "Foodspring" },
  { node: <MarqueeNoccoMark />, title: "NOCCO", ariaLabel: "NOCCO" },
  { node: <MarqueePipedriveMark />, title: "Pipedrive", ariaLabel: "Pipedrive" },
];

const MARQUEE_LOGOS: LogoItem[] = [...STRIP_LOGOS, ...WORDMARK_LOGOS];

function stripImgClass() {
  return "!h-[var(--landing-marquee-slide-h)] w-auto max-w-[min(92vw,720px)] object-contain [image-rendering:auto] grayscale invert contrast-110 mix-blend-multiply";
}

/** Infinite logo strip between hero and features — React Bits-style smooth loop + edge fade. */
export function LandingBrandMarquee() {
  return (
    <section
      className="relative isolate z-10 overflow-hidden bg-white py-6 [--landing-marquee-slide-h:52px] sm:py-7 sm:[--landing-marquee-slide-h:60px] md:[--landing-marquee-slide-h:68px]"
      aria-label="Brands and sectors Rival understands"
    >
      {/* Feather top into hero’s white ramp */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 top-[-14px] left-1/2 w-screen max-w-[100vw] -translate-x-1/2 bg-gradient-to-b from-transparent via-white/80 to-white sm:top-[-18px]"
      />

      <div className="relative z-[1] [&_img]:pointer-events-none">
        <div className="motion-reduce:block hidden py-2 sm:py-2.5">
          <ul className="flex flex-col items-center gap-10 px-4 sm:gap-11" role="list">
            {MARQUEE_LOGOS.map((entry) =>
              "src" in entry ? (
                <li key={entry.src} className="flex w-full justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local strip PNGs */}
                  <img
                    src={entry.src}
                    alt={entry.alt ?? ""}
                    width={entry.width}
                    height={entry.height}
                    className={`${stripImgClass()} max-h-[min(220px,40vh)] w-auto max-w-full`}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                </li>
              ) : (
                <li key={entry.title ?? "wordmark"} className="flex w-full justify-center text-black">
                  <span className="inline-flex max-h-[min(220px,40vh)] items-center">{entry.node}</span>
                </li>
              )
            )}
          </ul>
        </div>

        <div className="motion-reduce:hidden">
          <LogoLoop
            logos={MARQUEE_LOGOS}
            speed={118}
            direction="left"
            logoHeight={68}
            gap={56}
            hoverSpeed={12}
            scaleOnHover
            fadeOut
            fadeOutColor="#ffffff"
            ariaLabel="Brands and sectors Rival understands"
            renderItem={(item) =>
              "node" in item ? (
                <span className="inline-flex shrink-0 items-center text-black">{item.node}</span>
              ) : (
                <img
                  src={item.src}
                  alt={item.alt ?? ""}
                  width={item.width}
                  height={item.height}
                  srcSet={item.srcSet}
                  sizes={item.sizes}
                  title={item.title}
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
    </section>
  );
}
