"use client";

import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";

const DOMAIN_TEXT = "aurora.com";

function useScrollTypedLength(text: string, containerRef: React.RefObject<HTMLElement | null>) {
  const [length, setLength] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setLength(text.length);
      return;
    }

    const update = () => {
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.92;
      const end = vh * 0.38;
      const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end)));
      setLength(Math.round(progress * text.length));
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [text, containerRef]);

  return length;
}

export function HowItWorksDomainMock() {
  const cardRef = useRef<HTMLDivElement>(null);
  const typedLength = useScrollTypedLength(DOMAIN_TEXT, cardRef);
  const typed = DOMAIN_TEXT.slice(0, typedLength);
  const showCursor = typedLength < DOMAIN_TEXT.length;

  return (
    <div
      ref={cardRef}
      className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-[0_20px_50px_-24px_rgba(74,127,165,0.45)] backdrop-blur-xl backdrop-saturate-150 sm:p-5"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4a7fa5]">Add a rival</p>
      <label className="mt-3 block text-sm font-bold text-[#1a1a1a]">Competitor domain</label>
      <div className="mt-2.5 flex items-center gap-2 rounded-xl border-2 border-[#4a7fa5]/40 bg-white px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
        <Globe className="size-4 shrink-0 text-[#4a7fa5]" strokeWidth={2.25} aria-hidden />
        <span className="flex min-h-[1.25rem] flex-1 items-center text-sm font-semibold text-[#1a1a1a]">
          <span aria-hidden>{typed}</span>
          <span
            className={`ml-px inline-block h-[1.05em] w-0.5 bg-[#4a7fa5] ${showCursor ? "animate-pulse" : "opacity-0"}`}
            aria-hidden
          />
          <span className="sr-only">{DOMAIN_TEXT}</span>
        </span>
      </div>
      <p className="mt-2 text-[11px] text-gray-400">Type any competitor URL - Rival finds the rest.</p>
      <div
        className={`mt-4 rounded-xl bg-gradient-to-r from-[#4a7fa5] to-[#60a5fa] px-4 py-2.5 text-center text-sm font-bold text-white shadow-[0_8px_24px_-8px_rgba(74,127,165,0.55)] transition-opacity duration-300 ${
          typedLength === DOMAIN_TEXT.length ? "opacity-100" : "opacity-55"
        }`}
      >
        Start tracking
      </div>
    </div>
  );
}
