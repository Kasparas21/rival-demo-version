"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";

export function AdSaveRow({
  scrapedAdId,
  isSaved,
  onToggleSave,
  saveDisabled,
}: {
  scrapedAdId?: string;
  isSaved: boolean;
  onToggleSave?: () => void;
  saveDisabled?: boolean;
}) {
  return (
    <div className="mt-3 border-t border-[#e5e7eb] pt-3">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSave?.();
        }}
        disabled={saveDisabled || !onToggleSave}
        title={!scrapedAdId ? "Save syncs after this ad is stored in your library." : undefined}
        className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors border ${
          isSaved
            ? "bg-[#DDF1FD] text-[#343434] border-sky-200/90 hover:bg-[#c8e8fc]"
            : "bg-[#343434] text-white hover:bg-[#1f1f1f] border-[#343434]"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {isSaved ? (
          <>
            <BookmarkCheck className="h-3.5 w-3.5" />
            Saved
          </>
        ) : (
          <>
            <Bookmark className="h-3.5 w-3.5" />
            Save the Ad
          </>
        )}
      </button>
    </div>
  );
}
