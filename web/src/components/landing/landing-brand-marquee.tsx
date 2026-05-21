"use client";

import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import LogoLoop, { type LogoImgItem, type LogoItem } from "@/components/ui/logo-loop";

const UPLOADTHING_LOGOS: LogoImgItem[] = [
  {
    src: "https://8g55zxgme2.ufs.sh/f/Drcd6q9Ud57mpT141dY3ioqCgXkPlJzmOvapUc1GYEMfbstN",
    alt: "Partner logo",
    title: "IMG_1309.png",
    width: 3305,
    height: 337,
  },
  {
    src: "https://8g55zxgme2.ufs.sh/f/Drcd6q9Ud57m7zj6fB30ztENURWbyi4KfpQahlXDr6oS2jnM",
    alt: "Partner logo",
    title: "IMG_8869.png",
    width: 1280,
    height: 1063,
  },
  {
    src: "https://8g55zxgme2.ufs.sh/f/Drcd6q9Ud57mnsik3mOpAUc05haRBokQr7es8C4gLnDtVd3Y",
    alt: "Partner logo",
    title: "IMG_7490.png",
    width: 3840,
    height: 776,
  },
  {
    src: "https://8g55zxgme2.ufs.sh/f/Drcd6q9Ud57mBm6WiVMKWS8Fz1Q6m9BnTafJepxV5oNXIUvj",
    alt: "Partner logo",
    title: "IMG_1160.png",
    width: 2500,
    height: 2065,
  },
  {
    src: "https://8g55zxgme2.ufs.sh/f/Drcd6q9Ud57m68Of5KymJhew8PIdWsMfY1ypotvnir4Rgm5G",
    alt: "Partner logo",
    title: "IMG_2707.png",
    width: 256,
    height: 256,
  },
  {
    src: "https://8g55zxgme2.ufs.sh/f/Drcd6q9Ud57mLPSAfB6oblBEKcRnJxNvHfs5SXQUkI7eC0jz",
    alt: "Partner logo",
    title: "IMG_0519.png",
    width: 1920,
    height: 585,
  },
  {
    src: "https://8g55zxgme2.ufs.sh/f/Drcd6q9Ud57mO87Opio5fkuXsrdl3ADwq0E71RFyBUI9nje4",
    alt: "Partner logo",
    title: "IMG_5932.png",
    width: 1182,
    height: 329,
  },
];

const MARQUEE_LOGOS: LogoItem[] = UPLOADTHING_LOGOS;

function stripImgClass() {
  return "!h-[var(--landing-marquee-slide-h)] w-auto max-w-[min(92vw,720px)] object-contain [image-rendering:auto]";
}

/** Infinite logo strip between hero and features — React Bits-style smooth loop + edge fade. */
export function LandingBrandMarquee() {
  return (
    <section
      className="relative isolate z-10 overflow-hidden bg-white py-6 [--landing-marquee-slide-h:52px] sm:py-7 sm:[--landing-marquee-slide-h:60px] md:[--landing-marquee-slide-h:68px]"
      aria-label="Brands and sectors Rival understands"
    >
      <LandingScrollReveal className="relative z-[1] [&_img]:pointer-events-none">
        <div className="motion-reduce:block hidden py-2 sm:py-2.5">
          <ul className="flex flex-col items-center gap-10 px-4 sm:gap-11" role="list">
            {MARQUEE_LOGOS.map((entry) =>
              "src" in entry ? (
                <li key={entry.src} className="flex w-full justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- LogoLoop measures intrinsic img layout */}
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
