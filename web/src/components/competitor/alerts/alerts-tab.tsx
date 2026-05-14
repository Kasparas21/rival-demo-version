"use client";

import { Bell, Sparkles } from "lucide-react";

import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";

export function AlertsTab() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <Bell className="h-8 w-8 text-slate-400" />
      </div>
      <FeatureSectionHeader
        className="mx-auto max-w-md [&_.flex]:justify-center [&_.min-w-0]:text-center"
        overline="Alerts"
        title="Competitor alerts"
        description="Get notified when competitors launch new platforms, shift budget &gt;20%, kill top ads, or change landing pages. Email + in-app notifications."
        note={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-700">
            <Sparkles className="h-3 w-3" />
            Coming soon
          </span>
        }
      />
    </div>
  );
}
