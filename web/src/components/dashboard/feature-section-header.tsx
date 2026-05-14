import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type FeatureSectionHeaderProps = {
  overline: string;
  title: ReactNode;
  description?: ReactNode;
  /** Tertiary line (e.g. short explanatory copy under metadata). */
  note?: ReactNode;
  /** Inline after the title — freshness badge, status chips. */
  titleTrailing?: ReactNode;
  /** Prepended before the text block (e.g. back control). */
  leading?: ReactNode;
  /** Right column — toolbar actions, help, refresh. */
  actions?: ReactNode;
  variant?: "plain" | "card";
  className?: string;
};

/**
 * Canonical feature headline stack for dashboard tabs (Insights, Tests, Audience, etc.).
 * Keeps overline + title + description typography identical everywhere.
 */
export function FeatureSectionHeader({
  overline,
  title,
  description,
  note,
  titleTrailing,
  leading,
  actions,
  variant = "plain",
  className,
}: FeatureSectionHeaderProps) {
  const body = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{overline}</p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
            {titleTrailing}
          </div>
          {description ? <div className="mt-2 text-sm text-slate-500">{description}</div> : null}
          {note ? <div className="mt-1 text-xs leading-relaxed text-slate-500">{note}</div> : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-start justify-end gap-2 sm:gap-3">{actions}</div>
      ) : null}
    </div>
  );

  if (variant === "card") {
    return (
      <header className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm", className)}>{body}</header>
    );
  }

  return <header className={className}>{body}</header>;
}
