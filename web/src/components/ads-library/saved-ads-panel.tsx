"use client";

import { useCallback, useEffect, useState } from "react";
import { Bookmark, StickyNote, Trash2 } from "lucide-react";

import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import type { Json } from "@/lib/supabase/types";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";

function platformForIcon(p: string): StrategyPlatform {
  const x = p.toLowerCase();
  if (x === "youtube") return "google";
  if (
    x === "meta" ||
    x === "google" ||
    x === "tiktok" ||
    x === "linkedin" ||
    x === "pinterest" ||
    x === "snapchat"
  ) {
    return x;
  }
  return "meta";
}

export type SavedAdRow = {
  id: string;
  source_scraped_ad_id: string | null;
  platform: string;
  ad_text: string;
  ad_creative_url: string | null;
  format: string;
  ai_extracted_angle: string | null;
  notes: string | null;
  saved_at: string;
  raw_payload: Json;
};

type SavedAdsPanelProps = {
  competitorId: string;
  competitorLabel: string;
  onOpenAd: (scrapedAdId: string) => void;
};

export function SavedAdsPanel({ competitorId, competitorLabel, onOpenAd }: SavedAdsPanelProps) {
  const [savedAds, setSavedAds] = useState<SavedAdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const loadSavedAds = useCallback(async () => {
    if (!competitorId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/saved-ads?competitorId=${encodeURIComponent(competitorId)}`, {
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; savedAds?: SavedAdRow[]; error?: string };
      if (json.ok) {
        setSavedAds(json.savedAds ?? []);
      } else {
        setError(json.error ?? "Failed to load");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [competitorId]);

  useEffect(() => {
    void loadSavedAds();
  }, [loadSavedAds]);

  const handleUnsave = useCallback(async (savedAdId: string) => {
    const res = await fetch(`/api/saved-ads/${savedAdId}`, { method: "DELETE", credentials: "include" });
    const json = (await res.json()) as { ok?: boolean };
    if (json.ok) {
      setSavedAds((prev) => prev.filter((a) => a.id !== savedAdId));
    }
  }, []);

  const handleSaveNotes = useCallback(async (savedAdId: string, notes: string) => {
    const res = await fetch(`/api/saved-ads/${savedAdId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ notes }),
    });
    const json = (await res.json()) as { ok?: boolean; savedAd?: SavedAdRow };
    if (json.ok && json.savedAd) {
      setSavedAds((prev) => prev.map((a) => (a.id === savedAdId ? { ...a, notes: json.savedAd!.notes } : a)));
      setEditingNotesId(null);
    }
  }, []);

  if (!competitorId.trim()) {
    return (
      <p className="text-[14px] text-[#6b7280] py-8 text-center">Follow this competitor to use saved ads.</p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-[13px] text-[#808080]">Loading saved ads…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
    );
  }

  if (savedAds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-4 rounded-full bg-[#DDF1FD] p-4">
          <Bookmark className="h-8 w-8 text-[#343434]" />
        </div>
        <h3 className="mb-1 text-[16px] font-semibold text-[#343434]">No saved ads yet</h3>
        <p className="max-w-md text-[13px] text-[#808080]">Save any ad from the library to keep it here — even if the original is paused or deleted.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[18px] font-semibold text-[#343434]">Saved ads from {competitorLabel}</h2>
        <p className="mt-0.5 text-[12px] text-[#808080]">
          {savedAds.length} saved — preserved even if removed from the source
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {savedAds.map((sa) => (
          <SavedAdCard
            key={sa.id}
            savedAd={sa}
            isEditingNotes={editingNotesId === sa.id}
            noteDraft={noteDraft}
            onSetNoteDraft={setNoteDraft}
            onStartEditNotes={() => {
              setNoteDraft(sa.notes ?? "");
              setEditingNotesId(sa.id);
            }}
            onCancelEditNotes={() => setEditingNotesId(null)}
            onSaveNotes={() => void handleSaveNotes(sa.id, noteDraft.slice(0, 500))}
            onUnsave={() => void handleUnsave(sa.id)}
            onOpenAd={() => {
              if (sa.source_scraped_ad_id) onOpenAd(sa.source_scraped_ad_id);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SavedAdCard({
  savedAd,
  isEditingNotes,
  noteDraft,
  onSetNoteDraft,
  onStartEditNotes,
  onCancelEditNotes,
  onSaveNotes,
  onUnsave,
  onOpenAd,
}: {
  savedAd: SavedAdRow;
  isEditingNotes: boolean;
  noteDraft: string;
  onSetNoteDraft: (s: string) => void;
  onStartEditNotes: () => void;
  onCancelEditNotes: () => void;
  onSaveNotes: () => void;
  onUnsave: () => void;
  onOpenAd: () => void;
}) {
  const sourceUnavailable = !savedAd.source_scraped_ad_id;

  return (
    <article
      onClick={() => {
        if (!sourceUnavailable) onOpenAd();
      }}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white transition-shadow ${
        sourceUnavailable ? "" : "cursor-pointer hover:ring-2 hover:ring-[#343434]/20"
      }`}
    >
      <div className="relative aspect-square overflow-hidden bg-[#f3f4f6]">
        {savedAd.ad_creative_url ? (
          <img
            src={savedAd.ad_creative_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ComparisonPlatformIcon platform={platformForIcon(savedAd.platform)} className="h-12 w-12 opacity-30" />
          </div>
        )}

        {sourceUnavailable ? (
          <div className="absolute left-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            Source removed
          </div>
        ) : null}

        <div className="absolute right-2 top-2 flex items-center rounded-full bg-black/50 px-1.5 py-1">
          <ComparisonPlatformIcon platform={platformForIcon(savedAd.platform)} className="h-3.5 w-3.5 text-white" />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="mb-2 line-clamp-2 text-[12px] font-medium text-[#343434]">
          {savedAd.ai_extracted_angle?.trim() || savedAd.ad_text?.slice(0, 80) || "—"}
        </p>

        <p className="mb-3 text-[10px] text-[#808080]">
          Saved{" "}
          {new Date(savedAd.saved_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        {isEditingNotes ? (
          <div className="mb-2" onClick={(e) => e.stopPropagation()}>
            <textarea
              value={noteDraft}
              onChange={(e) => onSetNoteDraft(e.target.value.slice(0, 500))}
              placeholder="Why did you save this? (optional)"
              className="w-full resize-none rounded-md border border-[#e5e7eb] px-2 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-[#343434]/30"
              rows={3}
              autoFocus
            />
            <div className="mt-1.5 flex items-center gap-1">
              <button
                type="button"
                onClick={onSaveNotes}
                className="rounded-md bg-[#343434] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#1f1f1f]"
              >
                Save
              </button>
              <button
                type="button"
                onClick={onCancelEditNotes}
                className="rounded-md px-2 py-1 text-[10px] font-semibold text-[#808080] hover:bg-[#f3f4f6]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : savedAd.notes?.trim() ? (
          <button
            type="button"
            className="mb-2 cursor-text rounded-md bg-[#FFF4CB] px-2 py-1.5 text-left text-[11px] italic text-[#343434] hover:bg-[#fff0b3]"
            onClick={(e) => {
              e.stopPropagation();
              onStartEditNotes();
            }}
          >
            {savedAd.notes}
          </button>
        ) : (
          <button
            type="button"
            className="mb-2 inline-flex items-center gap-1 self-start rounded-md px-2 py-1 text-[10px] text-[#808080] hover:bg-[#f3f4f6]"
            onClick={(e) => {
              e.stopPropagation();
              onStartEditNotes();
            }}
          >
            <StickyNote className="h-3 w-3" />
            Add note
          </button>
        )}

        <div className="mt-auto border-t border-[#f1f5f9] pt-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onUnsave()}
            className="inline-flex w-full items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-semibold text-[#808080] transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3 w-3" />
            Unsave
          </button>
        </div>
      </div>
    </article>
  );
}
