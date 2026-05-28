"use client";

import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import LogoLoop, { type LogoImgItem, type LogoItem } from "@/components/ui/logo-loop";

type MarqueeLogo = LogoImgItem & { brandName: string };

const UPLOADTHING_LOGOS: MarqueeLogo[] = [
  {
    src: "https://8g55zxgme2.ufs.sh/f/Drcd6q9Ud57mpT141dY3ioqCgXkPlJzmOvapUc1GYEMfbstN",
    brandName: "DTC brand",
    alt: "DTC brand logo",
    title: "IMG_1309.png",
    width: 3305,
    height: 337,
  },
  {
    src: "https://8g55zxgme2.ufs.sh/f/Drcd6q9Ud57m7zj6fB30ztENURWbyi4KfpQahlXDr6oS2jnM",
    brandName: "E-commerce brand",
    alt: "E-commerce brand logo",
    title: "IMG_8869.png",
    width: 1280,
    height: 1063,
  },
  {
    src: "https://8g55zxgme2.ufs.sh/f/Drcd6q9Ud57mnsik3mOpAUc05haRBokQr7es8C4gLnDtVd3Y",
    brandName: "SaaS brand",
    alt: "SaaS brand logo",
    title: "IMG_7490.png",
    width: 3840,
    height: 776,
  },
  {
    src: "https://8g55zxgme2.ufs.sh/f/Drcd6q9Ud57mBm6WiVMKWS8Fz1Q6m9BnTafJepxV5oNXIUvj",
    brandName: "Retail brand",
    alt: "Retail brand logo",
    title: "IMG_1160.png",
    width: 2500,
    height: 2065,
  },
  {
    src: "https://8g55zxgme2.ufs.sh/f/Drcd6q9Ud57m68Of5KymJhew8PIdWsMfY1ypotvnir4Rgm5G",
    brandName: "Consumer brand",
    alt: "Consumer brand logo",
    title: "IMG_2707.png",
    width: 256,
    height: 256,
  },
  {
    src: "https://8g55zxgme2.ufs.sh/f/Drcd6q9Ud57mLPSAfB6oblBEKcRnJxNvHfs5SXQUkI7eC0jz",
    brandName: "Agency brand",
    alt: "Agency brand logo",
    title: "IMG_0519.png",
    width: 1920,
    height: 585,
  },
  {
    src: "https://8g55zxgme2.ufs.sh/f/Drcd6q9Ud57mO87Opio5fkuXsrdl3ADwq0E71RFyBUI9nje4",
    brandName: "Growth brand",
    alt: "Growth brand logo",
    title: "IMG_5932.png",
    width: 1182,
    height: 329,
  },
];

const MARQUEE_LOGOS = UPLOADTHING_LOGOS satisfies LogoItem[];

function stripImgClass() {
  return "!h-[var(--landing-marquee-slide-h)] w-auto max-w-[min(72vw,420px)] object-contain opacity-80 grayscale [image-rendering:auto]";
}

/** Infinite logo strip between hero and features — soft white gradient edges, subtle logos. */
export function LandingBrandMarquee() {
  return (
    <section
      className="relative isolate z-10 -mt-8 overflow-hidden pb-8 pt-10 [--landing-marquee-slide-h:24px] sm:-mt-10 sm:pb-10 sm:pt-12 sm:[--landing-marquee-slide-h:28px] md:[--landing-marquee-slide-h:32px]"
      aria-label="Brands and sectors Rival understands"
    >
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

      <LandingScrollReveal className="relative z-[1] opacity-50 [&_img]:pointer-events-none">
        <div className="motion-reduce:block hidden py-1 sm:py-1.5">
          <ul className="flex flex-col items-center gap-6 px-4 sm:gap-7" role="list">
            {UPLOADTHING_LOGOS.map((entry) => (
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

        <div className="motion-reduce:hidden">
          <LogoLoop
            logos={MARQUEE_LOGOS}
            speed={96}
            direction="left"
            logoHeight={32}
            gap={44}
            hoverSpeed={12}
            fadeOut
            fadeOutColor="#ffffff"
            ariaLabel="Brands and sectors Rival understands"
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
      </LandingScrollReveal>
    </section>
  );
}
