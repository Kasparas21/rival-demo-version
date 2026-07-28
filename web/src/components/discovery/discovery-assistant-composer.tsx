"use client";

import { useRef } from "react";
import { ArrowUp, Loader2, Paperclip, X } from "lucide-react";

import type { DiscoveryChatAttachment } from "@/lib/discovery/discovery-assistant-attachments";
import type { DiscoveryAdDto } from "@/lib/discovery/types";
import { cn } from "@/lib/utils";

type Props = {
  input: string;
  loading: boolean;
  expanded: boolean;
  attachments: DiscoveryChatAttachment[];
  selectedAds: DiscoveryAdDto[];
  attachmentError: string | null;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveAttachment: (id: string) => void;
  onClearSelectedAds: () => void;
  onRemoveSelectedAd: (adId: string) => void;
};

export function DiscoveryAssistantComposer({
  input,
  loading,
  expanded,
  attachments,
  selectedAds,
  attachmentError,
  onInputChange,
  onSend,
  onAddFiles,
  onRemoveAttachment,
  onClearSelectedAds,
  onRemoveSelectedAd,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const canSend = Boolean(input.trim() || attachments.length || selectedAds.length);

  return (
    <footer className="shrink-0 border-t border-white/50 p-3">
      {attachmentError ? <p className="mb-2 text-xs text-red-600">{attachmentError}</p> : null}

      {selectedAds.length || attachments.length ? (
        <div className="mb-2 space-y-2">
          {selectedAds.length ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--rival-muted)]">
                Selected ads
              </span>
              {selectedAds.map((ad) => (
                <button
                  key={ad.id}
                  type="button"
                  onClick={() => onRemoveSelectedAd(ad.id)}
                  className="inline-flex max-w-[220px] items-center gap-1 rounded-full border border-white/70 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-[color:var(--rival-primary)] backdrop-blur-sm"
                >
                  <span className="truncate">{ad.competitor_name}</span>
                  <X className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                </button>
              ))}
              <button
                type="button"
                onClick={onClearSelectedAds}
                className="text-[11px] font-medium text-[color:var(--rival-muted)] underline"
              >
                Clear
              </button>
            </div>
          ) : null}

          {attachments.length ? (
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="relative overflow-hidden rounded-xl border border-white/70 bg-white/70 shadow-sm"
                >
                  {attachment.kind === "image" && attachment.dataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={attachment.dataUrl}
                      alt={attachment.name}
                      className="h-14 w-14 object-cover"
                    />
                  ) : (
                    <div className="flex h-14 max-w-[180px] items-center px-3 text-[11px] font-medium text-[color:var(--rival-primary)]">
                      <span className="truncate">{attachment.name}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(attachment.id)}
                    className="absolute right-1 top-1 rounded-full bg-black/55 p-0.5 text-white"
                    aria-label={`Remove ${attachment.name}`}
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-end gap-2 rounded-2xl border border-white/70 bg-white/45 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-md">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          multiple
          accept="image/*,.txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json"
          onChange={(e) => {
            if (e.target.files?.length) onAddFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[color:var(--rival-primary)] transition hover:bg-[color-mix(in_srgb,var(--rival-accent-blue)_35%,white)]"
          aria-label="Attach file or image"
          title="Attach image or text file"
        >
          <Paperclip className="h-4 w-4" aria-hidden />
        </button>
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend && !loading) onSend();
            }
          }}
          rows={expanded ? 3 : 2}
          placeholder={
            selectedAds.length
              ? "Ask about the selected ad(s)…"
              : "Search keywords, filter ads, or ask about selected ads…"
          }
          className="max-h-28 min-h-[2.5rem] flex-1 resize-none bg-transparent text-sm text-[color:var(--rival-primary)] outline-none placeholder:text-[color:var(--rival-muted)]"
        />
        <button
          type="button"
          disabled={!canSend || loading}
          onClick={onSend}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--rival-primary)] text-white shadow-[0_8px_24px_-10px_rgba(52,52,52,0.42)] ring-1 ring-white/25 transition hover:bg-[#2d2d44] active:scale-95 disabled:opacity-40",
          )}
          aria-label="Send"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ArrowUp className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
      {selectedAds.length === 0 ? (
        <p className="mt-2 text-[10px] text-[color:var(--rival-muted)]">
          Tip: tap the circle on any ad card to select it, then ask for similar creative ideas.
        </p>
      ) : null}
    </footer>
  );
}
