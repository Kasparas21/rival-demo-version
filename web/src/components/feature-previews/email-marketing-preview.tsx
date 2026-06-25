"use client";

import { PreviewGlassPanel } from "@/components/feature-previews/preview-glass-panel";

const INBOX_ROWS = [
  {
    subject: "Summer sale — 30% off ends tonight",
    type: "Promotional",
    offer: "30% off · SUMMER30",
  },
  {
    subject: "Your cart is waiting",
    type: "Cart abandonment",
    offer: "Free shipping",
  },
  {
    subject: "What’s new this week",
    type: "Newsletter",
    offer: null,
  },
];

export function EmailMarketingPreview() {
  return (
    <PreviewGlassPanel label="Interactive preview · mock inbox">
      <div className="rounded-xl border border-white/75 bg-white/60 p-3 shadow-sm">
        <div className="border-b border-gray-200/80 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#4a7fa5]">Email marketing</p>
          <p className="text-xs font-semibold text-[#1a1a1a]">Captured inbox · Adidas</p>
          <p className="text-[10px] text-gray-500">3 emails · Klaviyo detected</p>
        </div>
        <ul className="mt-2.5 space-y-2">
          {INBOX_ROWS.map((row) => (
            <li
              key={row.subject}
              className="rounded-lg border border-gray-200/70 bg-white/80 px-2.5 py-2"
            >
              <p className="text-[11px] font-semibold text-gray-800">{row.subject}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500">
                <span className="rounded-full bg-sky-50 px-1.5 py-0.5 font-medium text-sky-800">
                  {row.type}
                </span>
                {row.offer ? (
                  <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-800">
                    {row.offer}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </PreviewGlassPanel>
  );
}
