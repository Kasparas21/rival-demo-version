"use client";

import { ArrowRight, Globe, Library, Mail, Share2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { StrategyGapItem } from "@/lib/workspace/build-strategy-gaps";

const CHANNEL_META: Record<
  StrategyGapItem["channel"],
  { label: string; icon: typeof Library; chip: string }
> = {
  paid: { label: "Paid", icon: Library, chip: "bg-violet-100 text-violet-900" },
  organic: { label: "Organic", icon: Share2, chip: "bg-emerald-100 text-emerald-900" },
  website: { label: "Website", icon: Globe, chip: "bg-sky-100 text-sky-900" },
  email: { label: "Email", icon: Mail, chip: "bg-amber-100 text-amber-950" },
};

type Props = {
  brandId?: string;
  fetchEnabled?: boolean;
  onNavigate: (tab: string, sub?: string | null) => void;
};

export function OwnBrandStrategyGapsPanel({ brandId, fetchEnabled = true, onNavigate }: Props) {
  const [gaps, setGaps] = useState<StrategyGapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!fetchEnabled) return;
    setLoading(true);
    setError(null);
    try {
      const q = brandId?.trim() ? `?brandId=${encodeURIComponent(brandId.trim())}` : "";
      const res = await fetch(`/api/workspace/strategy-gaps${q}`, { credentials: "include" });
      const json = (await res.json()) as { ok?: boolean; gaps?: StrategyGapItem[]; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Failed to load gaps");
      }
      setGaps(json.gaps ?? []);
    } catch (err) {
      setGaps([]);
      setError(err instanceof Error ? err.message : "Failed to load gaps");
    } finally {
      setLoading(false);
    }
  }, [brandId, fetchEnabled]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!fetchEnabled) return null;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
          Where competitors are ahead
        </p>
        <p className="mt-1 text-[13px] leading-snug text-slate-600">
          Gaps across paid, organic, website, and email vs rivals you follow.
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <p className="text-[13px] text-red-700">{error}</p>
      ) : gaps.length === 0 ? (
        <p className="text-[13px] text-slate-600">
          No major gaps detected yet — add competitors and refresh your channels for richer comparisons.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {gaps.map((gap, i) => {
            const meta = CHANNEL_META[gap.channel];
            const Icon = meta.icon;
            return (
              <li key={`${gap.channel}-${i}`}>
                <button
                  type="button"
                  onClick={() => onNavigate(gap.tab, gap.sub ?? null)}
                  className="group flex w-full items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 py-3 text-left transition hover:border-slate-300 hover:bg-white"
                >
                  <span
                    className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${meta.chip}`}
                  >
                    <Icon className="h-3 w-3" aria-hidden />
                    {meta.label}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-slate-900">{gap.title}</span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-slate-600">{gap.detail}</span>
                  </span>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-slate-700" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
