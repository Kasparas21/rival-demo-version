"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type AdRow = {
  id: string;
  copyPreview: string;
  creativeUrl: string | null;
  format: string;
  firstSeenAt: string;
  funnelStage: string | null;
  angle: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  competitorDomain: string;
  platform: string | null;
  onOpenAdsLibrary?: () => void;
};

export function NodeDetailSheet({ open, onClose, competitorDomain, platform, onOpenAdsLibrary }: Props) {
  const [loading, setLoading] = useState(false);
  const [ads, setAds] = useState<AdRow[]>([]);
  const [angles, setAngles] = useState<{ angle: string; count: number }[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !platform) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void (async () => {
      try {
        const q = new URLSearchParams({ competitorDomain, platform });
        const res = await fetch(`/api/strategy-overview/node?${q}`);
        const json = (await res.json()) as { ok: boolean; ads?: AdRow[]; angleDistribution?: { angle: string; count: number }[]; error?: string };
        if (cancelled) return;
        if (!json.ok) {
          setErr(json.error ?? "Failed to load");
          setAds([]);
          setAngles([]);
        } else {
          setAds(json.ads ?? []);
          setAngles(json.angleDistribution ?? []);
        }
      } catch {
        if (!cancelled) setErr("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, platform, competitorDomain]);

  if (!open || !platform) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal>
      <button type="button" className="absolute inset-0 bg-black/30" aria-label="Close" onClick={onClose} />
      <div className="relative h-full w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <p className="text-[15px] font-semibold text-[#0f172a] capitalize">{platform} ads</p>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-50 text-slate-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? <p className="text-[13px] text-slate-500">Loading samples…</p> : null}
          {err ? <p className="text-[13px] text-red-600">{err}</p> : null}
          {!loading && !err
            ? ads.map((a) => (
                <div key={a.id} className="rounded-xl border border-slate-100 p-3 space-y-2">
                  {a.creativeUrl ? (
                    <div className="relative h-32 w-full rounded-lg overflow-hidden bg-slate-100">
                      {/\.(mp4|webm)(\?|$)/i.test(a.creativeUrl) ? (
                        <video src={a.creativeUrl} className="h-full w-full object-cover" muted controls />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.creativeUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                  ) : null}
                  <p className="text-[12px] text-slate-700 leading-snug line-clamp-4">{a.copyPreview}</p>
                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">{a.format}</span>
                    {a.funnelStage ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5">{a.funnelStage}</span>
                    ) : null}
                    {a.angle ? <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-800">{a.angle}</span> : null}
                  </div>
                  <p className="text-[10px] text-slate-400">First seen {new Date(a.firstSeenAt).toLocaleDateString()}</p>
                </div>
              ))
            : null}
          {angles.length > 0 ? (
            <div className="rounded-xl border border-slate-100 p-3">
              <p className="text-[11px] font-semibold text-slate-600 mb-2">Angles on this platform</p>
              <ul className="text-[11px] space-y-1">
                {angles.map((x) => (
                  <li key={x.angle} className="flex justify-between">
                    <span>{x.angle}</span>
                    <span className="text-slate-500">{x.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="p-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onOpenAdsLibrary}
            className="w-full rounded-xl bg-[#0f172a] text-white text-[13px] font-medium py-2.5 hover:opacity-95"
          >
            View all in Ads Library
          </button>
        </div>
      </div>
    </div>
  );
}
