"use client";

import { FileText, Sparkles } from "lucide-react";

export function BriefsTab() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <FileText className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="mb-2 text-[16px] font-semibold text-slate-900">Briefs</h3>
      <p className="mb-4 max-w-md text-[13px] leading-relaxed text-slate-600">
        Pick 5 swipes from any tab. AI generates a creative brief — audience, angle, hook, visual direction, CTA — ready
        to hand to your designer.
      </p>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-700">
        <Sparkles className="h-3 w-3" />
        Coming soon
      </span>
    </div>
  );
}
