"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, FolderPlus, Loader2, X } from "lucide-react";

import { glassModalShellClass } from "@/components/ui/glass-styles";
import { invalidateSavedAdsCaches } from "@/lib/cache/cache-invalidator";
import { emitSavedItemsChanged } from "@/lib/saved-items/saved-items-events";
import type { SavedFolderRow } from "@/lib/saved-ads/saved-folders";
import { cn } from "@/lib/utils";

export type SaveAdRequest = {
  competitorId: string;
  scrapedAdId?: string;
  platform?: string;
  libraryItemId?: string;
  cacheDomainNorm?: string | null;
};

export type SaveAdResult = {
  savedAdId: string;
  sourceScrapedAdId: string | null;
};

type PendingSave = SaveAdRequest & {
  resolve: (result: SaveAdResult) => void;
  reject: (reason?: unknown) => void;
};

type SaveAdModalContextValue = {
  requestSaveAd: (request: SaveAdRequest) => Promise<SaveAdResult>;
};

const SaveAdModalContext = createContext<SaveAdModalContextValue | null>(null);

export function useSaveAdModal(): SaveAdModalContextValue {
  const ctx = useContext(SaveAdModalContext);
  if (!ctx) {
    throw new Error("useSaveAdModal must be used within SaveAdModalProvider");
  }
  return ctx;
}

/** Safe variant — returns null when provider is absent (e.g. marketing pages). */
export function useSaveAdModalOptional(): SaveAdModalContextValue | null {
  return useContext(SaveAdModalContext);
}

function SaveAdFolderModal({
  open,
  request,
  onClose,
  onSaved,
}: {
  open: boolean;
  request: PendingSave | null;
  onClose: () => void;
  onSaved: (result: SaveAdResult) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [folders, setFolders] = useState<SavedFolderRow[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const newFolderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setNotes("");
    setNewFolderName("");
    setError(null);
    setCreatingFolder(false);
    setLoadingFolders(true);
    void fetch("/api/saved-folders", { credentials: "include" })
      .then((r) => r.json())
      .then((res: { ok?: boolean; folders?: SavedFolderRow[] }) => {
        const list = res.ok ? (res.folders ?? []) : [];
        setFolders(list);
        setSelectedFolderId(list[0]?.id ?? null);
      })
      .catch(() => setError("Could not load folders"))
      .finally(() => setLoadingFolders(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose, saving]);

  const handleCreateFolder = useCallback(async () => {
    const name = newFolderName.trim();
    if (!name || creatingFolder) return;
    setCreatingFolder(true);
    setError(null);
    try {
      const res = await fetch("/api/saved-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      const json = (await res.json()) as { ok?: boolean; folder?: SavedFolderRow; error?: string };
      if (!json.ok || !json.folder) {
        setError(json.error ?? "Could not create folder");
        return;
      }
      setFolders((prev) => [...prev, json.folder!]);
      setSelectedFolderId(json.folder.id);
      setNewFolderName("");
      setCreatingFolder(false);
    } catch {
      setError("Could not create folder");
    } finally {
      setCreatingFolder(false);
    }
  }, [creatingFolder, newFolderName]);

  const handleSave = useCallback(async () => {
    if (!request || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/saved-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          competitorId: request.competitorId,
          scrapedAdId: request.scrapedAdId,
          platform: request.platform,
          libraryItemId: request.libraryItemId,
          folderId: selectedFolderId ?? undefined,
          notes: notes.trim() || null,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        savedAd?: { id: string; source_scraped_ad_id: string | null };
        error?: string;
      };
      if (!json.ok || !json.savedAd?.id) {
        setError(json.error ?? "Could not save ad");
        return;
      }
      emitSavedItemsChanged();
      const dom = request.cacheDomainNorm?.trim().toLowerCase();
      const cid = request.competitorId.trim();
      if (dom && cid) invalidateSavedAdsCaches(dom, cid);
      const result: SaveAdResult = {
        savedAdId: json.savedAd.id,
        sourceScrapedAdId: json.savedAd.source_scraped_ad_id,
      };
      onSaved(result);
    } catch {
      setError("Could not save ad");
    } finally {
      setSaving(false);
    }
  }, [notes, onSaved, request, saving, selectedFolderId]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && request ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 sm:p-6" role="presentation">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            aria-label="Close"
            onClick={() => !saving && onClose()}
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className={cn(glassModalShellClass, "relative z-10 w-full max-w-md p-0")}
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-ad-modal-title"
          >
            <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-700">
                  <Bookmark className="h-4 w-4" />
                </div>
                <div>
                  <h2 id="save-ad-modal-title" className="text-[15px] font-semibold text-slate-900">
                    Save to folder
                  </h2>
                  <p className="text-[12px] text-slate-500">Creative is archived permanently on save</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Folder
                </label>
                {loadingFolders ? (
                  <div className="flex h-24 items-center justify-center text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1">
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => setSelectedFolderId(folder.id)}
                        className={cn(
                          "flex w-full items-center rounded-lg px-3 py-2 text-left text-[13px] font-medium transition",
                          selectedFolderId === folder.id
                            ? "bg-slate-900 text-white"
                            : "text-slate-700 hover:bg-slate-50",
                        )}
                      >
                        {folder.name}
                      </button>
                    ))}
                    {folders.length === 0 ? (
                      <p className="px-3 py-2 text-[12px] text-slate-500">No folders yet — create one below</p>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  ref={newFolderInputRef}
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleCreateFolder();
                  }}
                  placeholder="New folder name…"
                  className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
                <button
                  type="button"
                  onClick={() => void handleCreateFolder()}
                  disabled={!newFolderName.trim() || creatingFolder}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {creatingFolder ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
                  Create
                </button>
              </div>

              <div>
                <label
                  htmlFor="save-ad-notes"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="save-ad-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="Why you saved this, angle to steal, etc."
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
                <p className="mt-1 text-right text-[10px] text-slate-400">{notes.length}/500</p>
              </div>

              {error ? <p className="text-[12px] font-medium text-red-600">{error}</p> : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200/80 px-5 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="h-10 rounded-xl px-4 text-[13px] font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || loadingFolders || (!selectedFolderId && folders.length === 0)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-[13px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />}
                Save ad
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

export function SaveAdModalProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingSave | null>(null);

  const requestSaveAd = useCallback((request: SaveAdRequest) => {
    return new Promise<SaveAdResult>((resolve, reject) => {
      setPending({ ...request, resolve, reject });
    });
  }, []);

  const handleClose = useCallback(() => {
    if (pending) {
      pending.reject(new Error("cancelled"));
      setPending(null);
    }
  }, [pending]);

  const handleSaved = useCallback(
    (result: SaveAdResult) => {
      pending?.resolve(result);
      setPending(null);
    },
    [pending],
  );

  const value = useMemo(() => ({ requestSaveAd }), [requestSaveAd]);

  return (
    <SaveAdModalContext.Provider value={value}>
      {children}
      <SaveAdFolderModal
        open={Boolean(pending)}
        request={pending}
        onClose={handleClose}
        onSaved={handleSaved}
      />
    </SaveAdModalContext.Provider>
  );
}
