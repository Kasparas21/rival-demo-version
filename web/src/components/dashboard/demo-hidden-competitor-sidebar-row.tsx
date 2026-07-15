export const DEMO_MARKED_COMPETITOR_TITLE =
  "Demo competitor — hidden from viewers unless NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION=true";

export const DEMO_HIDDEN_PLACEHOLDER_TITLE =
  "Hidden for demo — turn on NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION to show this competitor";

export function DemoCompetitorYellowDot({ className }: { className?: string }) {
  return (
    <span
      className={`h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white ${className ?? ""}`}
      aria-hidden
    />
  );
}

/** Shown in the sidebar slot when debug is off — competitor is hidden for demo. */
export function DemoHiddenCompetitorSidebarRow({ collapsed }: { collapsed: boolean }) {
  const dot = <DemoCompetitorYellowDot className="h-2.5 w-2.5" />;

  if (collapsed) {
    return (
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/45 ring-2 ring-inset ring-transparent"
        title={DEMO_HIDDEN_PLACEHOLDER_TITLE}
        aria-label="Hidden competitor (demo)"
      >
        {dot}
      </div>
    );
  }

  return (
    <div
      className="flex min-h-[52px] w-full min-w-0 items-center gap-3 rounded-xl bg-white/40 px-3 py-2.5 ring-2 ring-inset ring-transparent"
      title={DEMO_HIDDEN_PLACEHOLDER_TITLE}
      aria-label="Hidden competitor (demo)"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#e8e8e8]/80 bg-[#fafafa]">
        {dot}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-[#a1a1aa]">Hidden competitor</p>
        <p className="truncate text-[12px] text-[#c4c4c8]">Demo preview slot</p>
      </div>
    </div>
  );
}
