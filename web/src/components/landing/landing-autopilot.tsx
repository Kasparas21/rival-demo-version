import Image from "next/image";
import {
  AtSign,
  Bold,
  Code,
  FileText,
  Globe,
  Italic,
  Link2,
  List,
  Mail,
  Plus,
  SendHorizontal,
  Smile,
} from "lucide-react";

import {
  LandingHeadlineHighlight,
  landingSectionHeadlineClasses,
} from "@/components/landing/landing-headline-highlight";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import { MetaLogo, TikTokLogo } from "@/components/platform-logos";
import type { LandingAutopilotFeedItem, LandingCopy } from "@/lib/i18n/landing/types";

/** Colorful Slack hash mark for the channel chrome. */
function SlackLogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#E01E5A"
        d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313z"
      />
      <path
        fill="#36C5F0"
        d="M8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312z"
      />
      <path
        fill="#2EB67D"
        d="M18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 01-2.523 2.521 2.528 2.528 0 01-2.52-2.521V2.522A2.528 2.528 0 0115.163 0a2.528 2.528 0 012.523 2.522v6.312z"
      />
      <path
        fill="#ECB22E"
        d="M15.163 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.163 24a2.528 2.528 0 01-2.523-2.522v-2.522h2.523zm0-1.27a2.528 2.528 0 01-2.523-2.523 2.528 2.528 0 012.523-2.52h6.312A2.528 2.528 0 0124 15.163a2.528 2.528 0 01-2.522 2.523h-6.313z"
      />
    </svg>
  );
}

/** Small inline channel mark shown before each Rival message (Slack-emoji style). */
function ChannelMark({ tag }: { tag: LandingAutopilotFeedItem["tag"] }) {
  switch (tag) {
    case "ad":
      return <MetaLogo className="h-[15px] w-[15px]" />;
    case "organic":
      return <TikTokLogo className="h-[15px] w-[15px]" />;
    case "email":
      return <Mail className="size-[15px] text-[#5c7f2a]" strokeWidth={2} />;
    case "page":
      return <Globe className="size-[15px] text-[#1e3a8a]" strokeWidth={2} />;
    default:
      return <FileText className="size-[15px] text-[#a07d17]" strokeWidth={2} />;
  }
}

/** Emoji reactions per message index - Slack-style pills. */
const FEED_REACTIONS: Record<number, { emoji: string; count: number }[]> = {
  0: [{ emoji: "🔥", count: 3 }],
  4: [
    { emoji: "👀", count: 5 },
    { emoji: "✅", count: 2 },
  ],
};

/** "02:14" → "2:14 AM" so timestamps read like real Slack. */
function formatTime(t: string) {
  const [hRaw, m] = t.split(":");
  const h = Number(hRaw);
  const ampm = h < 12 ? "AM" : "PM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${m} ${ampm}`;
}

type Props = {
  copy: LandingCopy["autopilot"];
};

/** Autopilot feature - a faithful Slack channel where Rival posts overnight, above a stat band. */
export function LandingAutopilot({ copy }: Props) {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-8 text-center sm:px-6 sm:pb-24 sm:pt-10">
      <LandingScrollReveal className="mx-auto w-full max-w-6xl">
        <h2
          className={`${landingNavAnchorScrollClasses} ${landingSectionHeadlineClasses}`}
        >
          {copy.titleLine1}
          <br />
          <LandingHeadlineHighlight>{copy.titleHighlight}</LandingHeadlineHighlight>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-gray-500 sm:text-base">
          {copy.subtitle}
        </p>

        {/* Slack channel - the centered hero visual */}
        <div className="relative mx-auto mt-8 w-full max-w-2xl sm:mt-10 md:mt-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-[#611f69]/8 via-transparent to-[#2563eb]/8 blur-2xl"
          />
          <div className="relative overflow-hidden rounded-xl border border-[#e2e2e2] bg-white text-left shadow-[0_1px_3px_rgba(26,26,26,0.06),0_24px_56px_-24px_rgba(26,26,26,0.24)]">
            {/* Channel header */}
            <div
              className="flex items-center justify-between border-b border-[#e8e8e8] px-3 py-2 sm:px-4 sm:py-2.5"
              aria-label="Slack channel"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex shrink-0 items-center gap-1.5">
                  <SlackLogoMark className="size-[15px] sm:size-4" />
                  <span className="text-[11px] font-bold text-[#4A154B] sm:text-[12px]">Slack</span>
                </span>
                <span className="h-3.5 w-px shrink-0 bg-[#e0e0e0]" aria-hidden />
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="text-[15px] font-normal leading-none text-[#616061] sm:text-[17px]">#</span>
                  <span className="truncate text-[13px] font-black text-[#1d1c1d] sm:text-[15px]">
                    competitor-watch
                  </span>
                  <svg viewBox="0 0 20 20" className="size-3 shrink-0 text-[#616061]" fill="currentColor" aria-hidden>
                    <path d="M5 7l5 5 5-5H5z" />
                  </svg>
                </div>
              </div>
              <div className="hidden shrink-0 items-center gap-2 text-[#616061] sm:flex">
                <span className="inline-flex items-center gap-1 rounded-md border border-[#dcdcdc] px-1.5 py-0.5 text-[12px] font-medium">
                  <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden>
                    <path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8 0a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-2.7 0-8 1.3-8 4v3h10v-3c0-1 .4-1.9 1-2.6A13 13 0 0 0 8 13Zm8 0a10 10 0 0 0-1.3.1A6 6 0 0 1 18 17v3h6v-3c0-2.7-5.3-4-8-4Z" />
                  </svg>
                  248
                </span>
              </div>
            </div>

            {/* Date divider */}
            <div className="relative py-2 sm:py-3">
              <div className="absolute inset-x-4 top-1/2 h-px -translate-y-1/2 bg-[#e8e8e8]" />
              <div className="relative mx-auto w-fit rounded-full border border-[#dcdcdc] bg-white px-2.5 py-px text-[11px] font-bold text-[#1d1c1d] shadow-sm sm:px-3 sm:py-[3px] sm:text-[12px]">
                Today
              </div>
            </div>

            {/* Messages - fixed height on mobile (no inner scroll); full feed on sm+ */}
            <div className="pb-1">
              {copy.feed.items.map((item, i) => {
                const first = i === 0;
                const last = i === copy.feed.items.length - 1;
                const isMiddleItem = !first && !last;
                const reactions = FEED_REACTIONS[i];
                return (
                  <div
                    key={`${item.time}-${item.tag}`}
                    className={`landing-autopilot-feed-item group relative gap-2 px-3 hover:bg-[#f8f8f8] sm:px-4 ${isMiddleItem ? "hidden sm:flex" : "flex"} ${first ? "pb-0.5 pt-1.5 sm:pb-1 sm:pt-2" : "py-0.5"}`}
                    style={{ animationDelay: `${0.3 + i * 0.16}s` }}
                  >
                    {/* Left gutter: avatar (first) or hover timestamp (grouped) */}
                    <div className="w-7 shrink-0 pt-0.5 sm:w-9">
                      {first ? (
                        <span className="relative block size-7 sm:size-9">
                          <Image
                            src="/favicon.svg"
                            alt="Rival"
                            width={36}
                            height={36}
                            className="size-7 rounded-[6px] ring-1 ring-black/10 sm:size-9 sm:rounded-[8px]"
                          />
                          <span className="absolute -bottom-[2px] -right-[2px] size-[9px] rounded-full border-2 border-white bg-[#2bac76] sm:-bottom-[3px] sm:-right-[3px] sm:size-[11px]" />
                        </span>
                      ) : (
                        <span className="hidden pr-1 pt-[3px] text-right text-[10px] leading-none text-[#a5a5a5] tabular-nums group-hover:block">
                          {formatTime(item.time).replace(/ (AM|PM)$/, "")}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 pb-0.5 sm:pb-1">
                      {first ? (
                        <div className="flex items-center gap-1.5 leading-none">
                          <span className="text-[13px] font-black text-[#1d1c1d] sm:text-[15px]">Rival</span>
                          <span className="rounded-[3px] bg-[#e8e8e8] px-1 py-px text-[9px] font-bold uppercase leading-[1.4] tracking-wide text-[#616061] sm:text-[10px]">
                            App
                          </span>
                          <span className="text-[11px] text-[#616061] sm:text-[12px]">{formatTime(item.time)}</span>
                        </div>
                      ) : null}
                      <div className={`flex items-start gap-1.5 ${first ? "mt-0.5 sm:mt-1" : ""}`}>
                        <span className="mt-[2px] inline-flex shrink-0 sm:mt-[3px]">
                          <ChannelMark tag={item.tag} />
                        </span>
                        <span className="text-[12.5px] leading-[1.4] text-[#1d1c1d] sm:text-[15px] sm:leading-[1.46]">
                          {item.text}
                        </span>
                      </div>

                      {/* Rich Slack "brief" attachment on the report message - the payoff + CTA */}
                      {item.tag === "report" ? (
                        <div className="mt-1.5 max-w-[26rem] overflow-hidden rounded-r-md rounded-bl-md border-l-[3px] border-[#2563eb] bg-[#f7f9fc] px-2.5 py-2 ring-1 ring-inset ring-[#1a1a1a]/[0.05] sm:mt-2 sm:px-3 sm:py-2.5">
                          <p className="flex items-center gap-1.5 text-[12.5px] font-black text-[#1d1c1d] sm:text-[14px]">
                            <span aria-hidden>☕</span>
                            {copy.feed.brief.title}
                          </p>
                          <ul className="mt-2 hidden space-y-1.5 sm:block">
                            {copy.feed.brief.highlights.map((line, idx) => (
                              <li key={line} className="flex items-start gap-2 text-[13.5px] leading-snug text-[#1d1c1d]">
                                <span className="mt-px flex size-[17px] shrink-0 items-center justify-center rounded-full bg-[#2563eb]/12 text-[10px] font-black text-[#2563eb]">
                                  {idx + 1}
                                </span>
                                <span>{line}</span>
                              </li>
                            ))}
                          </ul>
                          <LandingTrialCta href="/onboarding" size="sm" className="mt-2 text-[12px] sm:mt-3 sm:text-[13px]">
                            {copy.feed.brief.cta}
                            <span aria-hidden>→</span>
                          </LandingTrialCta>
                        </div>
                      ) : null}

                      {reactions ? (
                        <div className="mt-1.5 hidden flex-wrap items-center gap-1 sm:flex">
                          {reactions.map((r) => (
                            <span
                              key={r.emoji}
                              className="inline-flex h-[24px] items-center gap-1 rounded-[12px] border border-[#d6e4f5] bg-[#e8f2fb] px-[7px] text-[12px] font-semibold text-[#1264a3]"
                            >
                              <span aria-hidden className="text-[13px] leading-none">
                                {r.emoji}
                              </span>
                              {r.count}
                            </span>
                          ))}
                          <span className="inline-flex h-[24px] items-center rounded-[12px] border border-[#e0e0e0] bg-white px-1.5 text-[#868686]">
                            <Smile className="size-3.5" strokeWidth={2} />
                            <Plus className="-ml-0.5 size-2.5" strokeWidth={3} />
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="hidden px-4 pb-2 pt-1 text-center text-[12px] italic text-[#a5a5a5] sm:block">
              {copy.feed.footer}
            </p>

            {/* Composer */}
            <div className="px-2.5 pb-2.5 sm:px-3 sm:pb-3">
              <div className="overflow-hidden rounded-lg border border-[#a9a9a9]/60 bg-white">
                <div className="hidden items-center gap-3 border-b border-[#ededed] px-2.5 py-1.5 text-[#616061] sm:flex">
                  <Bold className="size-[15px]" strokeWidth={2.4} />
                  <Italic className="size-[15px]" strokeWidth={2.4} />
                  <span className="h-4 w-px bg-[#e2e2e2]" />
                  <Link2 className="size-[15px]" strokeWidth={2.2} />
                  <List className="size-[15px]" strokeWidth={2.2} />
                  <Code className="size-[15px]" strokeWidth={2.2} />
                </div>
                <p className="px-2.5 py-1.5 text-[13px] text-[#8d8d8d] sm:px-3 sm:py-2.5 sm:text-[15px]">
                  Message #competitor-watch
                </p>
                <div className="flex items-center justify-between px-2 pb-1.5 pt-0 text-[#616061] sm:px-2.5 sm:pb-2 sm:pt-0.5">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <Plus className="size-[15px] sm:size-[17px]" strokeWidth={2.2} />
                    <Smile className="size-[15px] sm:size-[17px]" strokeWidth={2.2} />
                    <AtSign className="size-[15px] sm:size-[17px]" strokeWidth={2.2} />
                  </div>
                  <span className="flex size-5 items-center justify-center rounded bg-[#e8e8e8] text-[#9b9a97] sm:size-6">
                    <SendHorizontal className="size-3 sm:size-3.5" strokeWidth={2.4} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stat band - clean 3-up with dividers */}
        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 divide-y divide-[#1a1a1a]/[0.08] sm:mt-14 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {copy.stats.map((stat) => (
            <div key={stat.label} className="px-4 py-5 sm:py-2">
              <p className="text-[2.5rem] font-black leading-none tracking-tight text-[#1d4ed8] tabular-nums sm:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2.5 text-[15px] font-bold text-[#1a1a1a]">{stat.label}</p>
              <p className="mx-auto mt-1 max-w-[15rem] text-[13px] leading-snug text-gray-500">
                {stat.sub}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <LandingTrialCta href="/onboarding" size="md">
            {copy.cta}
          </LandingTrialCta>
        </div>
      </LandingScrollReveal>
    </section>
  );
}
