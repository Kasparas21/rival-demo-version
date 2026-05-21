"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { createContext, useContext, type ReactNode } from "react";

const DEBUG_SAVE_TITLE =
  "Hidden from users — visible only with NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION";

type AdSaveVisibilityContextValue = {
  visible: boolean;
  showDebugIndicator: boolean;
};

const AdSaveVisibilityContext = createContext<AdSaveVisibilityContextValue>({
  visible: true,
  showDebugIndicator: false,
});

export function AdSaveVisibilityProvider({
  visible,
  showDebugIndicator,
  children,
}: {
  visible: boolean;
  showDebugIndicator: boolean;
  children: ReactNode;
}) {
  return (
    <AdSaveVisibilityContext.Provider value={{ visible, showDebugIndicator }}>
      {children}
    </AdSaveVisibilityContext.Provider>
  );
}

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
  const { visible, showDebugIndicator } = useContext(AdSaveVisibilityContext);

  if (!visible) return null;

  return (
    <div className="mt-3 border-t border-[#e5e7eb] pt-3">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSave?.();
        }}
        disabled={saveDisabled || !onToggleSave}
        title={
          showDebugIndicator
            ? DEBUG_SAVE_TITLE
            : !scrapedAdId
              ? "Save syncs after this ad is stored in your library."
              : undefined
        }
        className={`relative w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors border ${
          isSaved
            ? "bg-[#DDF1FD] text-[#343434] border-sky-200/90 hover:bg-[#c8e8fc]"
            : "bg-[#343434] text-white hover:bg-[#1f1f1f] border-[#343434]"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {showDebugIndicator ? (
          <span
            className="absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-amber-400 ring-2 ring-white/80"
            aria-hidden
          />
        ) : null}
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

export { DEBUG_SAVE_TITLE as AD_SAVE_DEBUG_TITLE };
