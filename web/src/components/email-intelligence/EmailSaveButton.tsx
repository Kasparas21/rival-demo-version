"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export function EmailSaveButton({
  isSaved,
  onToggle,
  disabled,
  saving = false,
  compact = false,
  className,
}: {
  isSaved: boolean;
  onToggle: () => void;
  disabled?: boolean;
  saving?: boolean;
  compact?: boolean;
  className?: string;
}) {

  if (compact) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        disabled={disabled}
        aria-label={isSaved ? "Unsave email" : "Save email"}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-lg border p-1.5 transition-colors",
          isSaved
            ? "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"
            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800",
          disabled && "cursor-not-allowed opacity-60",
          className,
        )}
      >
        {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors",
        isSaved
          ? "border-sky-200 bg-sky-50 text-slate-800 hover:bg-sky-100"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
      {saving ? "Saving…" : isSaved ? "Saved" : "Save email"}
    </button>
  );
}
