"use client";

import { useState, type ReactNode } from "react";
import { countryFlagEmoji } from "@/lib/onboarding/ad-markets";

export type RegionChipOption = {
  value: string;
  label: string;
  /** Compact chip text (e.g. ISO2, ALL, 50). */
  shortTag: string;
  /** ISO 3166-1 alpha-2 for flag emoji; `null` uses a globe (world / all markets). */
  flagIso2: string | null;
};

function chipLeadingEmoji(flagIso2: string | null): string {
  if (flagIso2 && /^[A-Z]{2}$/.test(flagIso2)) return countryFlagEmoji(flagIso2);
  return "\u{1F310}";
}

const SCROLLER_SHELL_CLASS =
  "flex max-w-full flex-nowrap gap-1 overflow-x-auto overscroll-x-contain scroll-smooth rounded-lg border border-gray-200/70 bg-white/60 px-2 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const CHIP_BTN_CLASS = {
  on: "border-gray-900/35 bg-gray-900 text-white shadow-sm",
  off: "border-gray-200/95 bg-white/80 text-gray-600 hover:bg-white hover:text-gray-900",
} as const;

function SingleSelectFlagChipScroller({
  ariaLabel,
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  options: RegionChipOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={SCROLLER_SHELL_CLASS} role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <button
            key={opt.value.length ? opt.value : "__empty__"}
            type="button"
            role="radio"
            aria-checked={on}
            title={opt.label}
            onClick={() => onChange(opt.value)}
            className={`inline-flex shrink-0 snap-start items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide transition ${
              on ? CHIP_BTN_CLASS.on : CHIP_BTN_CLASS.off
            }`}
          >
            <span className="text-[0.85rem] leading-none" aria-hidden>
              {chipLeadingEmoji(opt.flagIso2)}
            </span>
            {opt.shortTag}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Horizontal scrollable flag chips (onboarding-style), single-select.
 */
export function SingleSelectFlagChipRow({
  ariaLabel,
  options,
  value,
  onChange,
}: {
  /** Shown above the scroller; also used as `aria-label`. */
  ariaLabel: string;
  options: RegionChipOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative mt-2 min-w-0">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#64748b]">{ariaLabel}</p>
      <SingleSelectFlagChipScroller
        ariaLabel={ariaLabel}
        options={options}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

/**
 * Collapsed by default: shows “Auto” until the user opens the picker; after that, the collapsed row
 * shows the selected region as a single chip. Use **Change** / **Edit** to open the scrollable list; **Done** closes it.
 */
export function CollapsibleSingleSelectFlagChipRow({
  ariaLabel,
  options,
  value,
  onChange,
  detailWhenExpanded,
}: {
  ariaLabel: string;
  options: RegionChipOption[];
  value: string;
  onChange: (value: string) => void;
  /** Optional note rendered under the scroller only while expanded (e.g. Snapchat EU hint). */
  detailWhenExpanded?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [everExpanded, setEverExpanded] = useState(false);

  const open = () => {
    setEverExpanded(true);
    setExpanded(true);
  };

  const close = () => setExpanded(false);

  const summaryOpt =
    options.find((o) => o.value === value) ??
    options.find((o) => o.value === "") ??
    options[0];

  return (
    <div className="relative mt-2 min-w-0">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#64748b]">{ariaLabel}</p>
        <button
          type="button"
          className="shrink-0 text-[11px] font-semibold text-[#1e6fa8] underline-offset-2 hover:text-[#155a8a] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e6fa8]/30 focus-visible:ring-offset-1 rounded"
          aria-expanded={expanded}
          onClick={() => (expanded ? close() : open())}
        >
          {expanded ? "Done" : everExpanded ? "Edit" : "Change"}
        </button>
      </div>
      {expanded ? (
        <>
          <SingleSelectFlagChipScroller
            ariaLabel={ariaLabel}
            options={options}
            value={value}
            onChange={onChange}
          />
          {detailWhenExpanded ? <div className="mt-1.5">{detailWhenExpanded}</div> : null}
        </>
      ) : (
        <div
          className={`${SCROLLER_SHELL_CLASS} items-center`}
          aria-label={
            everExpanded && summaryOpt ? `${ariaLabel} — ${summaryOpt.label}` : `${ariaLabel} — Auto`
          }
        >
          {everExpanded && summaryOpt ? (
            <span
              className={`inline-flex shrink-0 items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${CHIP_BTN_CLASS.on}`}
            >
              <span className="text-[0.85rem] leading-none" aria-hidden>
                {chipLeadingEmoji(summaryOpt.flagIso2)}
              </span>
              {summaryOpt.shortTag}
            </span>
          ) : (
            <span
              className={`inline-flex shrink-0 items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${CHIP_BTN_CLASS.on}`}
            >
              <span className="text-[0.85rem] leading-none" aria-hidden>
                {chipLeadingEmoji(null)}
              </span>
              Auto
            </span>
          )}
        </div>
      )}
    </div>
  );
}
