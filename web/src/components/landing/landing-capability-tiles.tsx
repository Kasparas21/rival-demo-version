import type { ReactNode } from "react";
import Link from "next/link";
import { Bot, Check, Mail } from "lucide-react";

import { ClaudeLogo, ChatGptLogo } from "@/components/landing/ai-assistant-logos";
import {
  GoogleLogo,
  InstagramLogo,
  MetaLogo,
  TikTokLogo,
} from "@/components/platform-logos";
import type { LandingCapabilityKey, LandingCapabilityTile } from "@/lib/i18n/landing/types";

function SlackHashMark({ className }: { className?: string }) {
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

function LogoCoin({ children, large = false }: { children: ReactNode; large?: boolean }) {
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-white/92 shadow-[0_1px_4px_rgba(26,26,26,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-white/90 backdrop-blur-sm ${
        large ? "size-7 sm:size-8" : "size-[18px] sm:size-5"
      }`}
    >
      {children}
    </span>
  );
}

function LogoStack({ children, large = false }: { children: ReactNode; large?: boolean }) {
  return <span className={`flex ${large ? "-space-x-1.5" : "-space-x-1"}`}>{children}</span>;
}

function tileIcon(key: LandingCapabilityKey, large: boolean): ReactNode {
  const logo = large ? "h-4 w-4 sm:h-[18px] sm:w-[18px]" : "h-2.5 w-2.5 sm:h-3 sm:w-3";
  const logoTikTok = large ? "h-4 w-3 sm:h-[18px] sm:w-4" : "h-2.5 w-2 sm:h-3 sm:w-2.5";
  const mail = large ? "size-3.5 sm:size-4" : "size-3 sm:size-[14px]";
  const slack = large ? "size-3.5 sm:size-4" : "size-3 sm:size-[14px]";
  const bot = large ? "size-3.5 sm:size-4" : "size-3 sm:size-[14px]";
  const ai = large ? "size-4 sm:size-5" : "size-3 sm:size-3.5";

  switch (key) {
    case "paid":
      return (
        <LogoStack large={large}>
          <LogoCoin large={large}>
            <MetaLogo className={logo} />
          </LogoCoin>
          <LogoCoin large={large}>
            <GoogleLogo className={logo} />
          </LogoCoin>
          <LogoCoin large={large}>
            <TikTokLogo className={logoTikTok} />
          </LogoCoin>
        </LogoStack>
      );
    case "organic":
      return (
        <LogoStack large={large}>
          <LogoCoin large={large}>
            <InstagramLogo className={logo} />
          </LogoCoin>
          <LogoCoin large={large}>
            <TikTokLogo className={logoTikTok} />
          </LogoCoin>
        </LogoStack>
      );
    case "email":
      return (
        <LogoCoin large={large}>
          <Mail className={`${mail} text-[#15803d]`} strokeWidth={2.25} aria-hidden />
        </LogoCoin>
      );
    case "autopilot":
      return (
        <LogoStack large={large}>
          <LogoCoin large={large}>
            <SlackHashMark className={slack} />
          </LogoCoin>
          <LogoCoin large={large}>
            <Bot className={`${bot} text-[#6d28d9]`} strokeWidth={2.25} aria-hidden />
          </LogoCoin>
        </LogoStack>
      );
    case "mcp":
      return (
        <LogoStack large={large}>
          <LogoCoin large={large}>
            <ClaudeLogo className={ai} />
          </LogoCoin>
          <LogoCoin large={large}>
            <ChatGptLogo className={ai} />
          </LogoCoin>
        </LogoStack>
      );
  }
}

const TILE_SHELLS: Record<LandingCapabilityKey, string> = {
  paid:
    "bg-gradient-to-br from-[#dbeafe]/55 to-[#bfdbfe]/20 border-white/75 ring-1 ring-[#60a5fa]/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_8px_24px_-8px_rgba(37,99,235,0.28)]",
  organic:
    "bg-gradient-to-br from-[#fce7f3]/55 to-[#fbcfe8]/20 border-white/75 ring-1 ring-[#f472b6]/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_8px_24px_-8px_rgba(219,39,119,0.22)]",
  email:
    "bg-gradient-to-br from-[#dcfce7]/55 to-[#bbf7d0]/20 border-white/75 ring-1 ring-[#4ade80]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_8px_24px_-8px_rgba(22,163,74,0.22)]",
  autopilot:
    "bg-gradient-to-br from-[#ede9fe]/60 to-[#ddd6fe]/22 border-white/75 ring-1 ring-[#a78bfa]/28 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_8px_24px_-8px_rgba(124,58,237,0.24)]",
  mcp:
    "bg-gradient-to-br from-white/50 via-[#faf6f0]/45 to-[#f5ebe0]/25 border-white/80 ring-1 ring-[#d97757]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_24px_-8px_rgba(217,119,87,0.18)]",
};

const HERO_GLASS =
  "bg-white/28 backdrop-blur-2xl backdrop-saturate-[1.65] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_14px_40px_-14px_rgba(74,127,165,0.28)]";

type Props = {
  label?: string;
  tiles: readonly LandingCapabilityTile[];
  compact?: boolean;
  /** Hero strip under CTA — 5-up row with checkmarks, no section label. */
  variant?: "grid" | "hero";
  className?: string;
  linkForKey?: Partial<Record<LandingCapabilityKey, { href: string; ariaLabel: string }>>;
};

function CapabilityTileCard({
  tile,
  shell,
  compact,
  hero,
  href,
  linkAriaLabel,
}: {
  tile: LandingCapabilityTile;
  shell: string;
  compact: boolean;
  hero: boolean;
  href?: string;
  linkAriaLabel?: string;
}) {
  const card = (
    <div
      className={`relative flex h-full flex-col items-center justify-center rounded-2xl border text-center ${hero ? HERO_GLASS : "backdrop-blur-xl backdrop-saturate-150"} ${shell} ${
        hero
          ? "gap-1.5 px-2 py-3.5 sm:gap-2 sm:px-2.5 sm:py-4"
          : `transition-transform duration-300 hover:-translate-y-0.5 ${
              compact ? "gap-1 px-1 py-2" : "gap-1.5 px-2 py-3 sm:gap-2 sm:px-2.5 sm:py-3.5"
            }`
      }`}
    >
      {hero ? (
        <span
          className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent"
          aria-hidden
        />
      ) : null}
      {hero ? (
        <span
          className="absolute -right-1 -top-1 z-10 flex size-[18px] items-center justify-center rounded-full bg-[#95C14B] shadow-[0_2px_6px_-1px_rgba(92,127,42,0.55)] ring-2 ring-white sm:size-5"
          aria-hidden
        >
          <Check className="size-2.5 text-white sm:size-3" strokeWidth={3} />
        </span>
      ) : null}
      {hero ? (
        <span className="flex min-h-[2.25rem] items-center justify-center sm:min-h-10">
          {tileIcon(tile.key, true)}
        </span>
      ) : (
        <span
          className={`flex items-center justify-center rounded-xl bg-white/55 ring-1 ring-white/80 ${
            compact ? "size-8" : "size-9 sm:size-10"
          }`}
        >
          {tileIcon(tile.key, false)}
        </span>
      )}
      <span
        className={`font-bold leading-tight text-[#1a1a1a] ${
          hero ? "text-[10px] sm:text-[11px]" : compact ? "text-[9px]" : "text-[10px] sm:text-[11px]"
        }`}
      >
        {tile.label}
      </span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} aria-label={linkAriaLabel ?? tile.label} className="block h-full transition-opacity hover:opacity-90">
        {card}
      </Link>
    );
  }

  return card;
}

/** Visual grid for Rival's full marketing intelligence stack. */
export function LandingCapabilityTiles({
  label,
  tiles,
  compact = false,
  variant = "grid",
  className = "",
  linkForKey,
}: Props) {
  const hero = variant === "hero";

  const heroGridClass =
    hero && tiles.length === 4
      ? "grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-2.5"
      : hero
        ? "grid grid-cols-2 gap-2 min-[520px]:grid-cols-3 lg:grid-cols-5 lg:gap-2.5"
        : `grid grid-cols-3 ${label ? (compact ? "mt-2" : "mt-3 sm:mt-3.5") : ""} ${
            compact ? "gap-1.5" : "gap-2 sm:gap-2.5"
          }`;

  return (
    <div className={className}>
      {label ? (
        <p
          className={`text-center font-bold uppercase tracking-[0.12em] text-[#4a7fa5] ${
            compact ? "text-[9px]" : "text-[10px] sm:text-[11px]"
          }`}
        >
          {label}
        </p>
      ) : null}
      <ul
        className={`${heroGridClass} ${label && hero ? (compact ? "mt-2" : "mt-3 sm:mt-3.5") : ""}`}
        aria-label={hero ? "Included in Rival" : undefined}
      >
        {tiles.map((tile, index) => {
          const shell = TILE_SHELLS[tile.key];
          const link = linkForKey?.[tile.key];
          const isLastOddHero =
            hero && tiles.length % 2 === 1 && index === tiles.length - 1;
          const isLastSoloGrid =
            !hero && tiles.length % 3 === 1 && index === tiles.length - 1;
          return (
            <li
              key={tile.key}
              className={
                isLastOddHero
                  ? "col-span-2 flex justify-center min-[520px]:col-span-1 min-[520px]:block"
                  : isLastSoloGrid
                    ? "col-start-2"
                    : undefined
              }
            >
              <div
                className={
                  isLastOddHero
                    ? "w-[calc((100%-0.5rem)/2)] min-[520px]:w-full"
                    : "h-full w-full"
                }
              >
                <CapabilityTileCard
                  tile={tile}
                  shell={shell}
                  compact={compact}
                  hero={hero}
                  href={link?.href}
                  linkAriaLabel={link?.ariaLabel}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
