"use client";

import { Bookmark } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

type CompetitorSavedHubTriggerProps = {
  count: number;
  onClick: () => void;
  className?: string;
};

export const CompetitorSavedHubTrigger = forwardRef<HTMLButtonElement, CompetitorSavedHubTriggerProps>(
  function CompetitorSavedHubTrigger({ count, onClick, className }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={cn(
          "relative inline-flex shrink-0 items-center gap-2 rounded-xl !border-black !bg-black px-3.5 py-2 text-[13px] font-semibold !text-white shadow-[0_4px_14px_rgba(0,0,0,0.35)] transition hover:!bg-neutral-900 hover:shadow-[0_6px_18px_rgba(0,0,0,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black [&_svg]:!text-white",
          className,
        )}
        aria-label={count > 0 ? `Saved items, ${count}` : "Saved items"}
      >
        <Bookmark className="h-4 w-4 text-white" strokeWidth={2.25} />
        <span className="hidden sm:inline">Saved</span>
        {count > 0 ? (
          <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-900">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>
    );
  },
);
