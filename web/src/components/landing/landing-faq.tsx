"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

import { LandingHeadlineHighlight } from "@/components/landing/landing-headline-highlight";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";
import { landingFaqItems } from "@/lib/seo/faq-items";

const FAQ_GLASS_CARD_BASE =
  "group relative w-full overflow-hidden rounded-[1.25rem] border text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_14px_40px_-18px_rgba(74,127,165,0.24)] backdrop-blur-2xl backdrop-saturate-[1.42] ring-1 transition-[background-color,border-color,box-shadow] duration-300";

const faqItems = landingFaqItems;

function FaqToggleIcon({ expanded, mobile }: { expanded: boolean; mobile?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_4px_14px_-6px_rgba(74,127,165,0.28)] backdrop-blur-md transition-[background-color,border-color,color,transform] duration-300 ${
        mobile ? "size-7" : "size-8"
      } ${
        expanded
          ? "border-[#4a7fa5]/35 bg-[#4a7fa5]/12 text-[#4a7fa5] rotate-0"
          : "border-white/80 bg-white/65 text-[#4a7fa5]/75 group-hover:border-white/90 group-hover:bg-white/80 group-hover:text-[#4a7fa5]"
      }`}
      aria-hidden
    >
      {expanded ? (
        <Minus className={mobile ? "size-3.5" : "size-4"} strokeWidth={2.5} />
      ) : (
        <Plus className={mobile ? "size-3.5" : "size-4"} strokeWidth={2.5} />
      )}
    </span>
  );
}

function faqCardClass(expanded: boolean) {
  return expanded
    ? "border-[#4a7fa5]/35 bg-white/58 ring-[#4a7fa5]/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_18px_48px_-16px_rgba(74,127,165,0.32)]"
    : "border-white/70 bg-white/48 ring-white/45 hover:border-white/85 hover:bg-white/56";
}

type FaqListProps = {
  open: boolean[];
  toggle: (index: number) => void;
};

/** Desktop FAQ list — unchanged layout and accordion animation. */
function LandingFAQDesktopList({ open, toggle }: FaqListProps) {
  return (
    <div className="mx-auto mt-10 hidden max-w-3xl space-y-3.5 text-left sm:mt-16 sm:space-y-4 md:block">
      {faqItems.map((item, idx) => {
        const expanded = open[idx];
        return (
          <button
            key={item.q}
            type="button"
            onClick={() => toggle(idx)}
            aria-expanded={expanded}
            className={`${FAQ_GLASS_CARD_BASE} cursor-pointer px-5 py-4 sm:px-6 sm:py-5 ${faqCardClass(expanded)}`}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent sm:inset-x-6"
            />
            <div
              aria-hidden
              className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl transition-opacity duration-300 ${
                expanded ? "bg-[#7eb3d4]/25 opacity-100" : "bg-[#7eb3d4]/15 opacity-0 group-hover:opacity-70"
              }`}
            />

            <div className="relative flex items-start justify-between gap-4 sm:gap-6">
              <span className="text-left text-[15px] font-semibold leading-snug text-[#1a1a1a] sm:text-base">
                {item.q}
              </span>
              <FaqToggleIcon expanded={expanded} />
            </div>

            <div
              className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
                expanded ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="border-t border-white/60 pt-4 text-sm leading-relaxed text-gray-600 sm:text-[15px] sm:leading-relaxed">
                  {item.a}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** Mobile FAQ list — tighter spacing; answers mount only when open (no collapsed ghost height). */
function LandingFAQMobileList({ open, toggle }: FaqListProps) {
  return (
    <div className="mx-auto mt-8 max-w-3xl space-y-2 text-left md:hidden">
      {faqItems.map((item, idx) => {
        const expanded = open[idx];
        return (
          <button
            key={item.q}
            type="button"
            onClick={() => toggle(idx)}
            aria-expanded={expanded}
            className={`${FAQ_GLASS_CARD_BASE} cursor-pointer px-4 py-3 ${faqCardClass(expanded)}`}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent"
            />
            <div
              aria-hidden
              className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-3xl transition-opacity duration-300 ${
                expanded ? "bg-[#7eb3d4]/25 opacity-100" : "bg-[#7eb3d4]/15 opacity-0"
              }`}
            />

            <div className="relative flex items-start justify-between gap-3">
              <span className="text-left text-[14px] font-semibold leading-snug text-[#1a1a1a]">
                {item.q}
              </span>
              <FaqToggleIcon expanded={expanded} mobile />
            </div>

            {expanded ? (
              <p className="relative mt-3 border-t border-white/60 pt-3 text-[13px] leading-relaxed text-gray-600">
                {item.a}
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function LandingFAQ() {
  const [open, setOpen] = useState<boolean[]>(() => Array(faqItems.length).fill(false));

  const toggle = (index: number) => {
    setOpen((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  return (
    <section className="relative overflow-hidden py-16 text-center sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-[8%] h-72 w-72 rounded-full bg-[#4a7fa5]/10 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-[10%] h-64 w-64 rounded-full bg-[#dbeafe]/45 blur-[100px]"
      />

      <LandingScrollReveal className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <p className="text-xs font-semibold lowercase tracking-widest text-[#4a7fa5]">not convinced yet?</p>
        <h2
          id="faq"
          className={`${landingNavAnchorScrollClasses} mt-2 text-[clamp(2.5rem,11vw,3.75rem)] font-bold lowercase leading-[1.05] text-[#1a1a1a]`}
        >
          frequently asked
          <br />
          <LandingHeadlineHighlight>questions.</LandingHeadlineHighlight>
        </h2>

        <LandingFAQMobileList open={open} toggle={toggle} />
        <LandingFAQDesktopList open={open} toggle={toggle} />
      </LandingScrollReveal>
    </section>
  );
}
