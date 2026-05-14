"use client";

import { useState } from "react";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";

const faqItems = [
  {
    q: "How does the free trial work?",
    a: "Sign up with your card, get 7 days of full Rival access tracking 1 competitor. Cancel anytime in the first 7 days and you won't be charged. If you continue, you're billed €79/month (or €59/month if you choose annual at signup). One click cancel, no retention calls.",
  },
  {
    q: "How is Rival different from Foreplay or AdSpy?",
    a: "Foreplay and AdSpy are ad libraries — they show you what your competitor runs. Rival is an intelligence platform — it shows you what they run AND tells you what to do about it. Three concrete differences: (1) Rival covers all 6 major ad platforms out of the box, not just Meta. (2) The Stealable Angles feature compares competitor angles against your own to find specific gaps — nobody else does this. (3) Three Moves delivers weekly tactical recommendations from your scrape data, not generic best practices.",
  },
  {
    q: "Is this legal?",
    a: "Yes. Rival only pulls data from publicly available ad transparency libraries that Meta, Google, TikTok, LinkedIn, Snapchat, and Reddit publish themselves. No private data, no account access required, no scraping of anything that isn't already public.",
  },
  {
    q: "How often does data update?",
    a: "Rival auto-scrapes every tracked competitor weekly. You can also trigger a manual scrape anytime. Most users open Rival on Monday morning to see fresh data from the past week.",
  },
  {
    q: "Can I track my own brand too?",
    a: "Yes, and we recommend it. Adding your own brand unlocks side-by-side stats, head-to-head comparisons, and the Stealable Angles feature, which compares competitor angles against your own library to find specific gaps.",
  },
  {
    q: "What platforms does Rival work with?",
    a: "Meta (Facebook and Instagram), Google (Search, Display, YouTube), TikTok, LinkedIn, Snapchat, and Reddit. All six are included in every plan — no per-platform upcharges.",
  },
  {
    q: "How accurate is the data?",
    a: "Ad detection is 95%+ across supported platforms (we cross-reference each platform's official transparency API). Strategic analysis (funnel classification, angle clustering, audience inference) ranges from 80–90% accuracy depending on data volume. Every analytical claim shows its source evidence — you can verify everything against the underlying ads.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. One click in your account settings. No retention calls, no 'are you sure' prompts. If you cancel mid-month, you keep access until the period ends.",
  },
] as const;

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
    <section className="overflow-hidden py-16 text-center sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#4a7fa5]">
          NOT CONVINCED YET?
        </p>
        <h2 id="faq" className={`${landingNavAnchorScrollClasses} mt-2 text-[clamp(2.5rem,11vw,3.75rem)] font-bold leading-[1.05] text-[#1a1a1a]`}>
          Frequently asked
          <br />
          <span className="text-[#4a7fa5]">questions.</span>
        </h2>

        <div className="mx-auto mt-10 max-w-3xl space-y-3 text-left sm:mt-16">
          {faqItems.map((item, idx) => {
            const expanded = open[idx];
            return (
              <button
                key={item.q}
                type="button"
                onClick={() => toggle(idx)}
                className="w-full cursor-pointer rounded-2xl bg-white px-5 py-4 text-left shadow-sm hover:bg-neutral-50/80 sm:px-7 sm:py-5"
              >
                <div className="flex items-start justify-between gap-6">
                  <span className="text-base font-medium text-[#1a1a1a]">{item.q}</span>
                  <span className="mt-px shrink-0 text-xl leading-none text-gray-400">{expanded ? "×" : "+"}</span>
                </div>
                {expanded && (
                  <p className="mt-3 border-t border-gray-100 pt-4 text-sm leading-relaxed text-gray-500">{item.a}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
