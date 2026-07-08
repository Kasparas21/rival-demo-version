"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { cn } from "@/lib/utils";

const COVERAGE_DEMO_POSTER_SRC = "/landing/rival-demo-poster.jpg";
const COVERAGE_DEMO_MP4_SRC = "/landing/rival-demo.mp4";

type Props = {
  revealIndex?: number;
  className?: string;
};

/** Full-width product demo — poster first, lazy-mount video when near viewport. */
export function CoverageDemoVideo({ revealIndex = 3, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "280px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <LandingScrollReveal delay={revealIndex * 0.08} className={cn("w-full", className)}>
      <figure ref={containerRef} className="relative mx-auto w-full">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-4 rounded-[2.75rem] bg-[radial-gradient(ellipse_90%_70%_at_50%_0%,rgba(74,127,165,0.42),transparent_68%)] opacity-90 blur-2xl sm:-inset-8"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-2 rounded-[2.25rem] bg-gradient-to-b from-[#4a7fa5]/20 via-[#7eb3d4]/10 to-[#1e3a5f]/15 blur-xl sm:-inset-5"
        />

        <div className="relative rounded-[1.35rem] bg-gradient-to-b from-[#c5d9e8] via-[#dce8f2] to-[#b8cedf] p-[3px] shadow-[0_48px_120px_-28px_rgba(26,26,26,0.42),0_24px_64px_-32px_rgba(74,127,165,0.45),0_0_0_1px_rgba(255,255,255,0.65)_inset] sm:rounded-[1.75rem] sm:p-1">
          <div className="overflow-hidden rounded-[1.2rem] bg-gradient-to-b from-[#1e2d3d] via-[#152232] to-[#0f1824] p-1.5 sm:rounded-[1.6rem] sm:p-2 md:p-2.5">
            <div className="relative overflow-hidden rounded-[0.95rem] ring-1 ring-white/[0.12] sm:rounded-[1.25rem]">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-[8%] top-0 z-[2] h-[28%] bg-gradient-to-b from-white/[0.14] to-transparent"
              />
              <div className="relative aspect-[16/10] w-full bg-[#0c1219]">
                <Image
                  src={COVERAGE_DEMO_POSTER_SRC}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 80rem, 100vw"
                  className={cn(
                    "object-cover object-top transition-opacity duration-700 ease-out",
                    inView && videoReady ? "opacity-0" : "opacity-100",
                  )}
                />
                {inView ? (
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    onCanPlay={() => setVideoReady(true)}
                    className={cn(
                      "pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover object-top transition-opacity duration-700 ease-out",
                      videoReady ? "opacity-100" : "opacity-0",
                    )}
            >
              <source src={COVERAGE_DEMO_MP4_SRC} type="video/mp4" />
            </video>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </figure>
    </LandingScrollReveal>
  );
}
