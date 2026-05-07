"use client";

import { useState } from "react";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";

const faqItems = [
  {
    q: "How does the free trial work?",
    a: "Start a 1-day free trial to unlock Spy Rival access, including platform libraries, AI insights, and exports where your plan allows. When the trial ends, your subscription continues unless you cancel first. You can manage billing from your account settings.",
  },
  {
    q: "What is Spy Rival exactly?",
    a: "Spy Rival is competitor ad intelligence: one search surfaces active ads across Meta, Google, TikTok, LinkedIn, Snapchat, and Reddit, plus AI-assisted summaries of creatives, funnels, and how rivals rotate messaging. Built for agencies and growth teams who want clarity without juggling six disclosure tools.",
  },
  {
    q: "Is this legal?",
    a: "Yes. Spy Rival ingests publicly available transparency and disclosure data: the same sources platforms publish for policy and advertiser accountability. You’re responsible for how you use the insights commercially and for complying with each platform’s terms and applicable law.",
  },
  {
    q: "Why is Spy Rival the best ad spy tool of 2026?",
    a: "It’s cross‑platform by design: unified search, funnel mapping, AI insight layers, alerts, and brand comparison in one workspace. Fewer subscriptions, fewer tabs, faster answers when you pitch or plan media.",
  },
  {
    q: "Is Spy Rival free?",
    a: "There’s no permanent free tier on the landing plans. Start with the 1-day free trial above, then keep your subscription active for ongoing searches and reports.",
  },
  {
    q: "What platforms does Spy Rival work with?",
    a: "Meta/Facebook Ads Library, Google Ads transparency, TikTok Ads Library, LinkedIn ad disclosures, Snapchat transparency, and Reddit: six platforms surfaced in every qualified search.",
  },
  {
    q: "How accurate is the data?",
    a: "We mirror what each transparency library shows; delays or gaps are usually on the publisher side (refresh cadence, geo filters, inactive ads hidden by policy). We label run dates and freshness where the source provides them so you can judge confidence.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Billing is monthly unless you agree to annual terms elsewhere—cancel before your renewal date from billing settings and keep access until the period ends. No long‑term contracts on these self‑serve plans.",
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
    <section className="py-24 text-center">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#4a7fa5]">
          NOT CONVINCED YET?
        </p>
        <h2 id="faq" className={`${landingNavAnchorScrollClasses} mt-2 text-5xl font-bold text-[#1a1a1a]`}>
          Frequently asked
          <br />
          <span className="text-[#4a7fa5]">questions.</span>
        </h2>

        <div className="mx-auto mt-16 max-w-3xl space-y-3 text-left">
          {faqItems.map((item, idx) => {
            const expanded = open[idx];
            return (
              <button
                key={item.q}
                type="button"
                onClick={() => toggle(idx)}
                className="w-full cursor-pointer rounded-2xl bg-white px-7 py-5 text-left shadow-sm hover:bg-neutral-50/80"
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
