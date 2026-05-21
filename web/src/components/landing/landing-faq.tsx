"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

import { LandingHeadlineHighlight } from "@/components/landing/landing-headline-highlight";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";

const FAQ_GLASS_CARD_BASE =
  "group relative w-full overflow-hidden rounded-[1.25rem] border text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_14px_40px_-18px_rgba(74,127,165,0.24)] backdrop-blur-2xl backdrop-saturate-[1.42] ring-1 transition-[background-color,border-color,box-shadow] duration-300";

const faqItems = [
  {
    q: "How does the free trial work?",
    a: "Sign up with your card and get 7 days of full Rival access tracking 1 competitor across all 6 platforms. Cancel anytime in the first 7 days and you won't be charged. If you continue, you're billed €79/month (or €59/month if you choose annual at signup). One-click cancel, no retention calls.",
  },
  {
    q: "How is Rival different from Foreplay or AdSpy?",
    a: "Foreplay and AdSpy are ad libraries — they show you what a competitor runs. Rival is an intelligence platform — it shows you what they run and tells you what to do about it. Three concrete differences: (1) Rival covers all 6 major ad platforms out of the box — Foreplay is Meta-only, AdSpy stops at Meta and Google. (2) The Stealable Angles feature compares a competitor's angles against your own library to find specific gaps you can fill — nobody else does this. (3) Three Moves delivers weekly tactical recommendations built from your actual scrape data, not generic best practices.",
  },
  {
    q: "Is this legal?",
    a: "Yes. Rival only pulls data from the publicly available ad transparency libraries that Meta, Google, TikTok, LinkedIn, Pinterest, and Snapchat publish themselves. No private data, no account access, nothing that isn't already public.",
  },
  {
    q: "How often does data update?",
    a: "Every tracked competitor refreshes automatically on a rolling schedule — fast-moving platforms like Meta and Google update every few days, others on a slightly longer cadence — so there's always fresh data waiting when you log in. Pro users can also trigger a manual refresh on demand. Most users open Rival on Monday morning to see everything that changed over the past week.",
  },
  {
    q: "Can I track my own brand too?",
    a: "Yes, and we recommend it. Adding your own brand unlocks side-by-side stats, head-to-head comparisons, and the Stealable Angles feature, which compares competitor angles against your own library to surface the specific gaps you should be testing.",
  },
  {
    q: "What platforms does Rival work with?",
    a: "Meta (Facebook and Instagram), Google (Search, Display, YouTube), TikTok, LinkedIn, Pinterest, and Snapchat. All six are included in every plan — no per-platform upcharges.",
  },
  {
    q: "How accurate is the data?",
    a: "Ad detection is highly reliable across supported platforms because we read directly from each platform's official transparency library. Strategic analysis — funnel classification, angle clustering, audience inference — is AI-generated and gets sharper as a competitor's data volume grows. Every analytical claim is tied back to the underlying ads, so you can always verify it against the source evidence yourself.",
  },
  {
    q: "Can I cancel anytime?",
    a: 'Yes. One click in your account settings — no retention calls, no "are you sure" prompts. If you cancel mid-cycle, you keep full access until the period ends.',
  },
] as const;

function FaqToggleIcon({ expanded }: { expanded: boolean }) {
  return (
    <span
      className={`flex size-8 shrink-0 items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_4px_14px_-6px_rgba(74,127,165,0.28)] backdrop-blur-md transition-[background-color,border-color,color,transform] duration-300 ${
        expanded
          ? "border-[#4a7fa5]/35 bg-[#4a7fa5]/12 text-[#4a7fa5] rotate-0"
          : "border-white/80 bg-white/65 text-[#4a7fa5]/75 group-hover:border-white/90 group-hover:bg-white/80 group-hover:text-[#4a7fa5]"
      }`}
      aria-hidden
    >
      {expanded ? <Minus className="size-4" strokeWidth={2.5} /> : <Plus className="size-4" strokeWidth={2.5} />}
    </span>
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

        <div className="mx-auto mt-10 max-w-3xl space-y-3.5 text-left sm:mt-16 sm:space-y-4">
          {faqItems.map((item, idx) => {
            const expanded = open[idx];
            return (
              <button
                key={item.q}
                type="button"
                onClick={() => toggle(idx)}
                aria-expanded={expanded}
                className={`${FAQ_GLASS_CARD_BASE} cursor-pointer px-5 py-4 sm:px-6 sm:py-5 ${
                  expanded
                    ? "border-[#4a7fa5]/35 bg-white/58 ring-[#4a7fa5]/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_18px_48px_-16px_rgba(74,127,165,0.32)]"
                    : "border-white/70 bg-white/48 ring-white/45 hover:border-white/85 hover:bg-white/56"
                }`}
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
      </LandingScrollReveal>
    </section>
  );
}
