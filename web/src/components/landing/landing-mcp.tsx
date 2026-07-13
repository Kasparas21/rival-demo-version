import { ChatGptLogo, ClaudeLogo, CursorLogo } from "@/components/landing/ai-assistant-logos";
import {
  LandingHeadlineHighlight,
  landingSectionHeadlineClasses,
} from "@/components/landing/landing-headline-highlight";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { LandingContactCta } from "@/components/landing/landing-contact-provider";
import type { LandingCopy } from "@/lib/i18n/landing/types";

/** Floating AI marks with horizontal motion blur - varied size + depth (near/mid/far). */
const FLOATING_LOGOS: {
  logo: "claude" | "chatgpt" | "cursor";
  className: string;
  size: string;
  opacity: string;
  /** Depth: near = big + soft focus, far = small + hazy. Maps to a blur filter. */
  depth: "near" | "mid" | "far";
  drift: "a" | "b" | "c";
  delay: string;
}[] = [
  // Scattered - staggered x, varied y, mixed depth (never a straight column)
  { logo: "claude", className: "left-[2%] top-[11%]", size: "size-44", opacity: "opacity-[0.42]", depth: "near", drift: "a", delay: "0s" },
  { logo: "chatgpt", className: "left-[15%] top-[47%]", size: "size-14", opacity: "opacity-[0.13]", depth: "far", drift: "b", delay: "-4s" },
  { logo: "cursor", className: "left-[6%] top-[81%]", size: "size-28", opacity: "opacity-[0.20]", depth: "mid", drift: "c", delay: "-2s" },
  { logo: "chatgpt", className: "right-[3%] top-[16%]", size: "size-24", opacity: "opacity-[0.20]", depth: "mid", drift: "b", delay: "-5.5s" },
  { logo: "claude", className: "right-[16%] top-[54%]", size: "size-16", opacity: "opacity-[0.15]", depth: "far", drift: "c", delay: "-1.5s" },
  { logo: "cursor", className: "right-[4%] top-[83%]", size: "size-40", opacity: "opacity-[0.26]", depth: "near", drift: "a", delay: "-3.5s" },
];

const DEPTH_FILTER: Record<"near" | "mid" | "far", string> = {
  near: "url(#mcp-blur-near)",
  mid: "url(#mcp-blur-mid)",
  far: "url(#mcp-blur-far)",
};

type Props = {
  copy: LandingCopy["mcp"];
};

/** MCP section - a 1:1 Claude-style chat over drifting, motion-blurred AI logos. */
export function LandingMcp({ copy }: Props) {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-8 text-center sm:px-6 sm:pb-24 sm:pt-10">
      {/* Horizontal motion-blur filters - three depths (real directional blur) */}
      <svg aria-hidden className="pointer-events-none absolute size-0">
        <filter id="mcp-blur-near" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14 0.9" />
        </filter>
        <filter id="mcp-blur-mid" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8 0.5" />
        </filter>
        <filter id="mcp-blur-far" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5 0.5" />
        </filter>
      </svg>

      {/* Drifting AI logos behind the chat */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 hidden sm:block">
        {FLOATING_LOGOS.map((f, i) => (
          <div
            key={i}
            className={`landing-mcp-logo landing-mcp-logo--${f.drift} absolute ${f.className}`}
            style={{ animationDelay: f.delay, filter: DEPTH_FILTER[f.depth] }}
          >
            {f.logo === "claude" ? (
              <ClaudeLogo className={`${f.size} ${f.opacity}`} />
            ) : f.logo === "cursor" ? (
              <CursorLogo className={`${f.size} text-[#1a1a1a] ${f.opacity}`} />
            ) : (
              <ChatGptLogo className={`${f.size} text-[#1a1a1a] ${f.opacity}`} />
            )}
          </div>
        ))}
      </div>

      <LandingScrollReveal className="relative z-10 mx-auto w-full max-w-6xl">
        <h2 className={landingSectionHeadlineClasses}>
          {copy.titleLine1}{" "}
          <LandingHeadlineHighlight>{copy.titleHighlight}</LandingHeadlineHighlight>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-gray-500 sm:text-base">
          {copy.subtitle}
        </p>

        {/* Claude-style chat window */}
        <div className="mx-auto mt-12 w-full max-w-2xl md:mt-14">
          <div className="overflow-hidden rounded-2xl border border-[#e5e1d8] bg-[#faf9f5] text-left shadow-[0_1px_3px_rgba(26,26,26,0.06),0_24px_60px_-24px_rgba(60,50,30,0.22)]">
            {/* Top bar - Claude wordmark + Rival connection */}
            <div className="flex items-center justify-between border-b border-[#ece8dd] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <ClaudeLogo className="size-[18px]" />
                <span className="text-[13px] font-semibold text-[#3d3a34]">Claude</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-black/[0.05]">
                <span aria-hidden className="size-1.5 rounded-full bg-[#7BA83C]" />
                <span className="text-[11px] font-medium text-[#6b6862]">
                  {copy.chat.connectedLabel}
                </span>
              </span>
            </div>

            <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
              {/* User bubble - right-aligned tan, like claude.ai */}
              <div className="flex justify-end">
                <p className="max-w-[85%] rounded-[1.25rem] rounded-br-md bg-[#f0eee6] px-4 py-2.5 text-[14px] leading-relaxed text-[#3d3a34]">
                  {copy.chat.userMsg}
                </p>
              </div>

              {/* Assistant - Claude mark + plain text on cream, no bubble */}
              <div className="flex gap-3">
                <ClaudeLogo className="mt-0.5 size-[22px] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[#28261f]">{copy.chat.replyIntro}</p>
                  <ul className="mt-2.5 space-y-2">
                    {copy.chat.replyBullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2.5">
                        <span
                          aria-hidden
                          className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#D97757]"
                        />
                        <span className="text-[13.5px] leading-relaxed text-[#3d3a34]">
                          {bullet}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-[#3d3a34]">
                    {copy.chat.replyOutro}
                  </p>
                </div>
              </div>

              {/* Input - Claude composer with model chip + coral send */}
              <div className="rounded-2xl border border-[#e0dccf] bg-white p-2.5 shadow-[0_1px_2px_rgba(26,26,26,0.04)]">
                <p className="px-2 pb-2 pt-1 text-left text-[13.5px] text-[#a8a49a]">
                  {copy.chat.inputPlaceholder}
                </p>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-[#6b6862]">
                    Claude Sonnet 4.5
                    <span aria-hidden className="text-[9px]">
                      ▾
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="flex size-7 items-center justify-center rounded-lg bg-[#D97757] text-[13px] font-bold text-white"
                  >
                    ↑
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Works-with chips - with real Claude + ChatGPT marks */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2.5">
          <span className="text-[13px] font-medium text-[#1a1a1a]/45">{copy.worksWith}</span>
          {copy.clients.map((client) => (
            <span
              key={client}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e7e5e0] bg-white px-3.5 py-1.5 text-[13px] font-semibold text-[#1a1a1a]/75 shadow-[0_1px_2px_rgba(26,26,26,0.04)]"
            >
              {client === "Claude" || client === "Claude Code" ? (
                <ClaudeLogo className="size-3.5" />
              ) : client === "ChatGPT" ? (
                <ChatGptLogo className="size-3.5 text-[#1a1a1a]" />
              ) : client === "Cursor" ? (
                <CursorLogo className="size-3.5 text-[#1a1a1a]" />
              ) : null}
              {client}
            </span>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <LandingContactCta size="md" />
        </div>
      </LandingScrollReveal>
    </section>
  );
}
