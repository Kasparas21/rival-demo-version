"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bot,
  History,
  Loader2,
  Maximize2,
  Minimize2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";

import type { DiscoveryFeedTab, DiscoveryToolbarState } from "@/components/discovery/discovery-types";
import { DiscoveryAssistantAdGallery } from "@/components/discovery/discovery-assistant-ad-gallery";
import { DiscoveryAssistantComposer } from "@/components/discovery/discovery-assistant-composer";
import { DiscoveryAssistantVisualMessage } from "@/components/discovery/discovery-assistant-visual-message";
import { useDiscoverySavedAds } from "@/components/discovery/use-discovery-saved-ads";
import {
  createDiscoveryChatSession,
  deleteDiscoveryChatSession,
  listDiscoveryChatSessions,
  loadDiscoveryChatSession,
  migrateLegacyDiscoveryChat,
  saveDiscoveryChatMessages,
  type DiscoveryChatEntry,
  type DiscoveryChatSession,
} from "@/lib/discovery/discovery-assistant-chat-store";
import {
  applyDiscoveryFilterPatch,
  DISCOVERY_ASSISTANT_SUGGESTIONS,
  type DiscoveryAssistantMessage,
  type DiscoveryAssistantResponse,
} from "@/lib/discovery/discovery-assistant-types";
import {
  attachmentInputFromChat,
  parseChatAttachmentFiles,
  type DiscoveryChatAttachment,
} from "@/lib/discovery/discovery-assistant-attachments";
import { aiGlassCardClass, aiSectionLabelClass } from "@/lib/ad-detail/ad-preview-analysis-styles";
import { formatRelativeTime } from "@/components/email-intelligence/email-intelligence-ui";
import type { DiscoveryAdDto } from "@/lib/discovery/types";
import { cn } from "@/lib/utils";

type PanelProps = {
  open: boolean;
  onClose: () => void;
  onClusterExpandedChange?: (expanded: boolean) => void;
  brandId: string;
  brandName: string;
  tab: DiscoveryFeedTab;
  toolbar: DiscoveryToolbarState;
  competitors: { id: string; name: string }[];
  onApplyFilters: (patch: Partial<DiscoveryToolbarState>) => void;
  onSelectTab: (tab: DiscoveryFeedTab) => void;
  onOpenAd: (adId: string) => void;
};

type AssistantWindow = {
  windowId: string;
  sessionId: string;
  messages: DiscoveryChatEntry[];
  loading: boolean;
  error: string | null;
  input: string;
  selectedAdIds: string[];
  pendingAttachments: DiscoveryChatAttachment[];
  attachmentError: string | null;
};

type PersistedAssistantUi = {
  sessionIds: string[];
  activeSessionId: string | null;
  clusterExpanded?: boolean;
  expanded?: boolean;
  expandedSessionId?: string | null;
  clusterSize?: ClusterSize | null;
  paneWidths?: Record<string, number>;
};

type ClusterSize = { width: number; height: number };

const PANEL_SPRING = { type: "spring" as const, damping: 34, stiffness: 380, mass: 0.82 };
const PANE_SPRING = { type: "spring" as const, damping: 32, stiffness: 360, mass: 0.78 };
const UI_STATE_KEY = (brandId: string) => `rival_discovery_assistant_ui_${brandId}`;
const COMPACT_PANE_WIDTH = 400;
const MIN_CLUSTER_WIDTH = 520;
const MIN_CLUSTER_HEIGHT = 420;
const MIN_PANE_WIDTH = 280;

function getSidebarWidthPx(): number {
  if (typeof window === "undefined") return 280;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--rival-sidebar-width").trim();
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 280;
}

function getDefaultClusterSize(): ClusterSize {
  if (typeof window === "undefined") return { width: 1200, height: 800 };
  const sidebar = window.innerWidth >= 640 ? getSidebarWidthPx() : 0;
  return {
    width: Math.max(MIN_CLUSTER_WIDTH, window.innerWidth - sidebar),
    height: Math.max(MIN_CLUSTER_HEIGHT, window.innerHeight),
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function startPointerDrag(
  e: React.PointerEvent,
  onMove: (dx: number, dy: number, ev: PointerEvent) => void,
  onEnd?: () => void,
): void {
  e.preventDefault();
  e.stopPropagation();
  const target = e.currentTarget as HTMLElement;
  target.setPointerCapture(e.pointerId);
  const startX = e.clientX;
  const startY = e.clientY;
  let lastX = startX;
  let lastY = startY;
  const onPointerMove = (ev: PointerEvent) => {
    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    onMove(dx, dy, ev);
  };
  const onPointerUp = () => {
    target.releasePointerCapture(e.pointerId);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    onEnd?.();
  };
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
}

const assistantGlassShell =
  "relative overflow-hidden border border-white/70 bg-white/48 backdrop-blur-2xl backdrop-saturate-[1.5] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_24px_80px_-20px_rgba(74,127,165,0.22),0_8px_32px_-12px_rgba(52,52,52,0.1)] ring-1 ring-[color-mix(in_srgb,var(--rival-accent-blue)_45%,white)]";

const assistantGlassHeader =
  "border-b border-[color-mix(in_srgb,var(--rival-accent-blue)_35%,white)] bg-gradient-to-r from-white/60 via-[color-mix(in_srgb,var(--rival-accent-blue)_22%,white)] to-[color-mix(in_srgb,var(--rival-accent-warm)_18%,white)]";

const assistantPrimaryBtn =
  "bg-[color:var(--rival-primary)] text-white shadow-[0_8px_24px_-10px_rgba(52,52,52,0.42)] ring-1 ring-white/25 transition hover:bg-[#2d2d44] active:scale-95";

const assistantPlusBtn =
  "bg-[color-mix(in_srgb,var(--rival-accent-blue)_78%,white)] text-[color:var(--rival-primary)] shadow-[0_4px_18px_-8px_rgba(74,127,165,0.4)] ring-1 ring-[color-mix(in_srgb,var(--rival-accent-blue)_55%,white)] transition hover:bg-[color:var(--rival-accent-blue)] active:scale-95";

const assistantBotIcon =
  "bg-[color-mix(in_srgb,var(--rival-accent-blue)_70%,white)] text-[color:var(--rival-primary)] ring-1 ring-[color-mix(in_srgb,var(--rival-accent-blue)_50%,white)]";

const assistantIconBtn =
  "rounded-xl p-2 text-[#52525b] transition hover:bg-[color-mix(in_srgb,var(--rival-accent-blue)_35%,white)] hover:text-[color:var(--rival-primary)]";

const assistantIconBtnActive =
  "rounded-xl bg-[color:var(--rival-primary)] p-2 text-white shadow-sm";

function newWindowId(): string {
  return `win_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function readPersistedUi(brandId: string): PersistedAssistantUi | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(UI_STATE_KEY(brandId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedAssistantUi;
    if (!parsed || !Array.isArray(parsed.sessionIds)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersistedUi(brandId: string, ui: PersistedAssistantUi): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(UI_STATE_KEY(brandId), JSON.stringify(ui));
  } catch {
    /* ignore */
  }
}

function windowFromSession(session: DiscoveryChatSession): AssistantWindow {
  return {
    windowId: newWindowId(),
    sessionId: session.id,
    messages: session.messages,
    loading: false,
    error: null,
    input: "",
    selectedAdIds: [],
    pendingAttachments: [],
    attachmentError: null,
  };
}

function adsByIdFromMessages(messages: DiscoveryChatEntry[]): Map<string, DiscoveryAdDto> {
  const map = new Map<string, DiscoveryAdDto>();
  for (const msg of messages) {
    for (const ad of msg.discoveryAds ?? []) {
      map.set(ad.id, ad);
    }
  }
  return map;
}

function windowTitle(win: AssistantWindow, sessions: DiscoveryChatSession[]): string {
  const session = sessions.find((s) => s.id === win.sessionId);
  if (session?.title && session.title !== "New chat") return session.title;
  const firstUser = win.messages.find((m) => m.role === "user");
  if (firstUser?.content.trim()) return firstUser.content.trim().slice(0, 40);
  return "New chat";
}

function PaneResizeDivider({ onDrag }: { onDrag: (dx: number) => void }) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize chat panes"
      className="group relative z-20 flex w-2 shrink-0 cursor-col-resize items-stretch touch-none"
      onPointerDown={(e) => {
        startPointerDrag(e, (dx) => onDrag(dx));
      }}
    >
      <div className="mx-auto h-full w-px bg-transparent transition group-hover:bg-[color-mix(in_srgb,var(--rival-accent-blue)_55%,white)] group-active:bg-[color:var(--rival-primary)]" />
    </div>
  );
}

function ClusterResizeHandle({
  edge,
  onDrag,
}: {
  edge: "left" | "top" | "corner";
  onDrag: (dx: number, dy: number) => void;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute z-30 touch-none",
        edge === "left" && "bottom-0 left-0 top-0 w-2 cursor-ew-resize",
        edge === "top" && "left-0 right-0 top-0 h-2 cursor-ns-resize",
        edge === "corner" && "left-0 top-0 h-4 w-4 cursor-nwse-resize",
      )}
      onPointerDown={(e) => {
        startPointerDrag(e, (dx, dy) => onDrag(dx, dy));
      }}
    />
  );
}

type ChatPaneProps = {
  win: AssistantWindow;
  index: number;
  isPrimary: boolean;
  clusterExpanded: boolean;
  paneWidth?: number;
  brandName: string;
  sessions: DiscoveryChatSession[];
  historyOpen: boolean;
  isSaved: (id: string) => boolean;
  isPending: (id: string) => boolean;
  reduceMotion: boolean | null;
  onClosePane: () => void;
  onToggleExpanded: () => void;
  onToggleHistory: () => void;
  onNewChat: () => void;
  onInputChange: (value: string) => void;
  onSend: (text?: string) => void;
  onOpenAd: (adId: string) => void;
  onToggleSave: (ad: DiscoveryAdDto) => void;
  onToggleSelectAd: (ad: DiscoveryAdDto) => void;
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onClearSelectedAds: () => void;
  onRemoveSelectedAd: (adId: string) => void;
  onLoadSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
};

function DiscoveryAssistantChatPane({
  win,
  index,
  isPrimary,
  clusterExpanded,
  paneWidth,
  brandName,
  sessions,
  historyOpen,
  isSaved,
  isPending,
  reduceMotion,
  onClosePane,
  onToggleExpanded,
  onToggleHistory,
  onNewChat,
  onInputChange,
  onSend,
  onOpenAd,
  onToggleSave,
  onToggleSelectAd,
  onAddFiles,
  onRemoveAttachment,
  onClearSelectedAds,
  onRemoveSelectedAd,
  onLoadSession,
  onDeleteSession,
}: ChatPaneProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const title = windowTitle(win, sessions);
  const adsById = useMemo(() => adsByIdFromMessages(win.messages), [win.messages]);
  const selectedAds = useMemo(
    () => win.selectedAdIds.map((id) => adsById.get(id)).filter((ad): ad is DiscoveryAdDto => Boolean(ad)),
    [adsById, win.selectedAdIds],
  );
  const selectedAdIdSet = useMemo(() => new Set(win.selectedAdIds), [win.selectedAdIds]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }, [win.messages, win.loading, historyOpen, reduceMotion]);

  return (
    <motion.div
      layout
      data-session-id={win.sessionId}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 28, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 20, scale: 0.96 }}
      transition={PANE_SPRING}
      style={
        clusterExpanded
          ? paneWidth
            ? { width: paneWidth, minWidth: MIN_PANE_WIDTH, flex: "0 0 auto" }
            : { minWidth: MIN_PANE_WIDTH, flex: "1 1 0" }
          : { width: COMPACT_PANE_WIDTH, minWidth: COMPACT_PANE_WIDTH }
      }
      className={cn(
        "flex shrink-0 flex-col",
        clusterExpanded ? "h-full min-h-0" : "h-[min(760px,calc(100vh-6rem))]",
        assistantGlassShell,
        "rounded-[1.65rem]",
      )}
    >
      <header className={cn("flex shrink-0 items-center justify-between gap-2 px-3.5 py-3", assistantGlassHeader)}>
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm",
              assistantBotIcon,
            )}
          >
            <Bot className="h-3.5 w-3.5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[color:var(--rival-primary)]">
              {title}
            </p>
            <p className="truncate text-[10px] text-[color:var(--rival-muted)]">
              {brandName}
              {isPrimary ? " · Assistant" : ` · Chat ${index + 1}`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {isPrimary ? (
            <button
              type="button"
              onClick={onNewChat}
              className={cn(assistantIconBtn, "text-[color:var(--rival-primary)]")}
              aria-label="New chat"
              title="New chat to the left"
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onToggleExpanded}
            className={clusterExpanded ? assistantIconBtnActive : assistantIconBtn}
            aria-label={clusterExpanded ? "Collapse" : "Expand"}
            aria-pressed={clusterExpanded}
          >
            {clusterExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          {isPrimary ? (
            <button
              type="button"
              onClick={onToggleHistory}
              className={historyOpen ? assistantIconBtnActive : assistantIconBtn}
              aria-label="Chat history"
              aria-pressed={historyOpen}
            >
              <History className="h-4 w-4" />
            </button>
          ) : null}
          <button type="button" onClick={onClosePane} className={assistantIconBtn} aria-label="Close chat">
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {isPrimary && historyOpen ? (
          <motion.div
            key="history"
            initial={reduceMotion ? false : { opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: 10 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex items-center justify-between border-b border-white/50 px-3.5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--rival-muted)]">
                History
              </p>
              <button
                type="button"
                onClick={onNewChat}
                className={cn("inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold", assistantPlusBtn)}
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {sessions.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-[color:var(--rival-muted)]">No past chats yet.</p>
              ) : (
                <ul className="space-y-1">
                  {sessions.map((session) => {
                    const active = session.id === win.sessionId;
                    return (
                      <li key={session.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => onLoadSession(session.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onLoadSession(session.id);
                            }
                          }}
                          className={cn(
                            "group flex w-full cursor-pointer items-start gap-2 rounded-xl px-3 py-2.5 text-left transition",
                            active
                              ? "bg-[color-mix(in_srgb,var(--rival-primary)_88%,#1a1a2e)] text-white shadow-sm"
                              : "hover:bg-white/50",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className={cn("truncate text-sm font-medium", active ? "text-white" : "text-[color:var(--rival-primary)]")}>
                              {session.title}
                            </p>
                            <p className={cn("mt-0.5 text-[11px]", active ? "text-white/70" : "text-[color:var(--rival-muted)]")}>
                              {session.messages.length} messages · {formatRelativeTime(session.updatedAt)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => onDeleteSession(session.id, e)}
                            className={cn(
                              "mt-0.5 shrink-0 rounded-lg p-1.5 opacity-0 transition group-hover:opacity-100",
                              active ? "text-white/80 hover:bg-white/10" : "text-slate-400 hover:bg-red-50 hover:text-red-600",
                            )}
                            aria-label="Delete chat"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 overflow-y-auto px-3.5 py-3">
              <div className={cn("space-y-3", clusterExpanded && "space-y-4")}>
                {win.messages.length === 0 ? (
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("p-3", aiGlassCardClass)}
                  >
                    <p className={aiSectionLabelClass}>Try asking</p>
                    <ul className="mt-2 space-y-1.5">
                      {DISCOVERY_ASSISTANT_SUGGESTIONS.slice(0, clusterExpanded ? 6 : 4).map((s) => (
                        <li key={s}>
                          <button
                            type="button"
                            onClick={() => void onSend(s)}
                            className="w-full rounded-xl border border-white/70 bg-white/55 px-3 py-2.5 text-left text-sm text-[color:var(--rival-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-sm transition hover:border-[color-mix(in_srgb,var(--rival-accent-blue)_55%,white)] hover:bg-white/75"
                          >
                            {s}
                          </button>
                        </li>
                      ))}
                    </ul>
                    {isPrimary ? (
                      <p className="mt-3 text-[11px] leading-relaxed text-[color:var(--rival-muted)]">
                        Also via{" "}
                        <Link href="/docs/mcp" className="font-semibold text-[color:var(--rival-primary)] underline">
                          MCP
                        </Link>
                      </p>
                    ) : null}
                  </motion.div>
                ) : null}

                {win.messages.map((msg, i) => (
                  <motion.div
                    key={`${msg.role}-${i}-${msg.content.slice(0, 24)}`}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", damping: 28, stiffness: 340 }}
                    className={cn(
                      msg.role === "user"
                        ? cn(
                            "ml-auto max-w-[92%] rounded-2xl bg-[color:var(--rival-primary)] px-3.5 py-2.5 text-sm leading-relaxed text-white shadow-[0_8px_24px_-12px_rgba(52,52,52,0.35)]",
                            clusterExpanded && "max-w-[min(560px,72%)]",
                          )
                        : "w-full",
                    )}
                  >
                    {msg.role === "user" ? (
                      <div className="space-y-2">
                        {msg.selectedAdRefs?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {msg.selectedAdRefs.map((ad) => (
                              <span
                                key={ad.id}
                                className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white/90"
                              >
                                {ad.competitor_name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {msg.attachments?.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {msg.attachments.map((attachment) =>
                              attachment.kind === "image" && attachment.dataUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  key={attachment.id}
                                  src={attachment.dataUrl}
                                  alt={attachment.name}
                                  className="h-12 w-12 rounded-lg object-cover ring-1 ring-white/30"
                                />
                              ) : (
                                <span
                                  key={attachment.id}
                                  className="rounded-lg bg-white/15 px-2 py-1 text-[10px] text-white/90"
                                >
                                  {attachment.name}
                                </span>
                              ),
                            )}
                          </div>
                        ) : null}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ) : (
                      <div className={cn("overflow-hidden rounded-2xl p-2", aiGlassCardClass)}>
                        {(msg.discoveryAds?.length ?? 0) > 0 ? (
                          <DiscoveryAssistantAdGallery
                            ads={msg.discoveryAds!}
                            isSaved={isSaved}
                            isPending={isPending}
                            onOpenAd={onOpenAd}
                            onToggleSave={(ad) => onToggleSave(ad)}
                            expanded={clusterExpanded}
                            selectable
                            selectedAdIds={selectedAdIdSet}
                            onToggleSelectAd={onToggleSelectAd}
                          />
                        ) : null}
                        <div className="px-1 pb-1 pt-2">
                          <DiscoveryAssistantVisualMessage message={msg.content} visualStats={msg.visualStats} />
                          {msg.suggestions?.length ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {msg.suggestions.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => void onSend(s)}
                                  className="rounded-full border border-white/70 bg-white/60 px-2.5 py-1 text-[11px] font-medium text-[color:var(--rival-primary)] backdrop-blur-sm transition hover:bg-white/85"
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}

                {win.loading ? (
                  <div className="flex items-center gap-2 px-1 text-sm text-[color:var(--rival-muted)]">
                    <Loader2 className="h-4 w-4 animate-spin text-[color:var(--rival-primary)]" aria-hidden />
                    Searching competitors…
                  </div>
                ) : null}
                {win.error ? <p className="text-sm text-red-600">{win.error}</p> : null}
                <div ref={endRef} />
              </div>
            </div>

            <DiscoveryAssistantComposer
              input={win.input}
              loading={win.loading}
              expanded={clusterExpanded}
              attachments={win.pendingAttachments}
              selectedAds={selectedAds}
              attachmentError={win.attachmentError}
              onInputChange={onInputChange}
              onSend={() => onSend()}
              onAddFiles={onAddFiles}
              onRemoveAttachment={onRemoveAttachment}
              onClearSelectedAds={onClearSelectedAds}
              onRemoveSelectedAd={onRemoveSelectedAd}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DiscoveryAssistantPanel({
  open,
  onClose,
  onClusterExpandedChange,
  brandId,
  brandName,
  tab,
  toolbar,
  competitors,
  onApplyFilters,
  onSelectTab,
  onOpenAd,
}: PanelProps) {
  const reduceMotion = useReducedMotion();
  const [clusterExpanded, setClusterExpanded] = useState(false);
  const [clusterSize, setClusterSize] = useState<ClusterSize | null>(null);
  const [paneWidths, setPaneWidths] = useState<Record<string, number>>({});
  const [windows, setWindows] = useState<AssistantWindow[]>([]);
  const [sessions, setSessions] = useState<DiscoveryChatSession[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const clusterRef = useRef<HTMLDivElement>(null);
  const panesRef = useRef<HTMLDivElement>(null);
  const clusterSizeRef = useRef<ClusterSize | null>(null);
  const paneWidthsRef = useRef<Record<string, number>>({});
  clusterSizeRef.current = clusterSize;
  paneWidthsRef.current = paneWidths;

  const assistantAdRefs = useMemo(() => {
    const map = new Map<string, { id: string; competitor_id: string }>();
    for (const win of windows) {
      for (const msg of win.messages) {
        for (const ad of msg.discoveryAds ?? []) {
          map.set(ad.id, { id: ad.id, competitor_id: ad.competitor_id });
        }
      }
    }
    return [...map.values()];
  }, [windows]);

  const { isSaved, isPending, toggleSave } = useDiscoverySavedAds(
    assistantAdRefs,
    `assistant:${brandId}`,
  );

  const refreshSessions = useCallback(() => {
    setSessions(listDiscoveryChatSessions(brandId));
  }, [brandId]);

  const persistUi = useCallback(
    (
      nextWindows: AssistantWindow[],
      nextClusterExpanded: boolean,
      nextClusterSize: ClusterSize | null = clusterSizeRef.current,
      nextPaneWidths: Record<string, number> = paneWidthsRef.current,
    ) => {
      const primary = nextWindows[nextWindows.length - 1];
      writePersistedUi(brandId, {
        sessionIds: nextWindows.map((w) => w.sessionId),
        activeSessionId: primary?.sessionId ?? null,
        clusterExpanded: nextClusterExpanded,
        clusterSize: nextClusterSize,
        paneWidths: nextPaneWidths,
      });
    },
    [brandId],
  );

  const updateWindow = useCallback((windowId: string, patch: Partial<AssistantWindow>) => {
    setWindows((prev) => prev.map((w) => (w.windowId === windowId ? { ...w, ...patch } : w)));
  }, []);

  const addWindow = useCallback(
    (session?: DiscoveryChatSession) => {
      const created = session ?? createDiscoveryChatSession(brandId);
      const win = windowFromSession(created);
      setWindows((prev) => {
        const next = [win, ...prev];
        persistUi(next, clusterExpanded);
        return next;
      });
      setHistoryOpen(false);
      refreshSessions();
      window.setTimeout(() => {
        scrollRef.current?.scrollTo({ left: 0, behavior: reduceMotion ? "auto" : "smooth" });
      }, 60);
      return win;
    },
    [brandId, clusterExpanded, persistUi, refreshSessions, reduceMotion],
  );

  const startNewChat = useCallback(() => addWindow(), [addWindow]);

  const initWindows = useCallback(() => {
    migrateLegacyDiscoveryChat(brandId);
    refreshSessions();

    const persisted = readPersistedUi(brandId);
    const sessionList = listDiscoveryChatSessions(brandId);

    if (persisted?.sessionIds.length) {
      const loaded: AssistantWindow[] = [];
      for (const sessionId of persisted.sessionIds) {
        const session =
          sessionList.find((s) => s.id === sessionId) ?? loadDiscoveryChatSession(brandId, sessionId);
        if (session) loaded.push(windowFromSession(session));
      }
      if (loaded.length) {
        setWindows(loaded);
        const restoredExpanded =
          persisted.clusterExpanded ??
          persisted.expanded ??
          Boolean(persisted.expandedSessionId);
        setClusterExpanded(restoredExpanded);
        setClusterSize(persisted.clusterSize ?? null);
        const widths = persisted.paneWidths ?? {};
        const openIds = new Set(loaded.map((w) => w.sessionId));
        const prunedWidths = Object.fromEntries(
          Object.entries(widths).filter(([id]) => openIds.has(id)),
        );
        setPaneWidths(prunedWidths);
        return;
      }
    }

    const active = sessionList[0] ?? createDiscoveryChatSession(brandId);
    const win = windowFromSession(active);
    setWindows([win]);
    setClusterExpanded(false);
    setClusterSize(null);
    setPaneWidths({});
    persistUi([win], false, null, {});
  }, [brandId, persistUi, refreshSessions]);

  const loadSession = useCallback(
    (sessionId: string) => {
      const session = loadDiscoveryChatSession(brandId, sessionId);
      if (!session) return;
      const existing = windows.find((w) => w.sessionId === sessionId);
      if (existing) {
        updateWindow(existing.windowId, { messages: session.messages, error: null });
      } else {
        const win = windowFromSession(session);
        setWindows((prev) => {
          const next = [win, ...prev];
          persistUi(next, clusterExpanded);
          return next;
        });
      }
      setHistoryOpen(false);
      refreshSessions();
    },
    [brandId, clusterExpanded, persistUi, refreshSessions, updateWindow, windows],
  );

  const closeWindow = useCallback(
    (windowId: string) => {
      if (windows.length <= 1) {
        onClose();
        return;
      }
      const closing = windows.find((w) => w.windowId === windowId);
      const next = windows.filter((w) => w.windowId !== windowId);
      const nextPaneWidths = { ...paneWidths };
      if (closing) delete nextPaneWidths[closing.sessionId];
      if (next.length === 1) {
        Object.keys(nextPaneWidths).forEach((id) => delete nextPaneWidths[id]);
      }
      setPaneWidths(nextPaneWidths);
      setWindows(next);
      persistUi(next, clusterExpanded, clusterSize, nextPaneWidths);
    },
    [clusterExpanded, clusterSize, onClose, paneWidths, persistUi, windows],
  );

  const initializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;
    initWindows();
  }, [open, brandId, initWindows]);

  useEffect(() => {
    if (!open) return;
    for (const win of windows) {
      if (win.messages.length) saveDiscoveryChatMessages(brandId, win.sessionId, win.messages);
    }
    refreshSessions();
    persistUi(windows, clusterExpanded, clusterSize, paneWidths);
  }, [brandId, windows, clusterExpanded, clusterSize, paneWidths, open, persistUi, refreshSessions]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (historyOpen) setHistoryOpen(false);
        else if (clusterExpanded) setClusterExpanded(false);
        else onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, historyOpen, clusterExpanded]);

  useEffect(() => {
    if (!open) return;
    onClusterExpandedChange?.(clusterExpanded);
  }, [open, clusterExpanded, onClusterExpandedChange]);

  const sendForWindow = useCallback(
    async (windowId: string, overrideText?: string) => {
      const win = windows.find((w) => w.windowId === windowId);
      if (!win) return;
      const trimmed = (overrideText ?? win.input).trim();
      const hasContext =
        trimmed.length > 0 || win.pendingAttachments.length > 0 || win.selectedAdIds.length > 0;
      if (!hasContext || win.loading) return;

      const adsById = adsByIdFromMessages(win.messages);
      const selectedAdRefs = win.selectedAdIds
        .map((id) => adsById.get(id))
        .filter((ad): ad is DiscoveryAdDto => Boolean(ad))
        .map((ad) => ({
          id: ad.id,
          competitor_name: ad.competitor_name,
          preview: ad.ad_text.trim().slice(0, 80) || "Ad",
        }));

      const attachments = [...win.pendingAttachments];
      const messageText =
        trimmed ||
        (selectedAdRefs.length
          ? "Analyze the selected ad(s) and give me fresh creative ideas inspired by them — not copies."
          : "Please analyze the attached file(s).");

      updateWindow(windowId, {
        error: null,
        loading: true,
        input: "",
        pendingAttachments: [],
        attachmentError: null,
        selectedAdIds: [],
      });

      const userMsg: DiscoveryChatEntry = {
        role: "user",
        content: messageText,
        attachments,
        selectedAdIds: selectedAdRefs.map((ad) => ad.id),
        selectedAdRefs,
      };
      const nextMessages = [...win.messages, userMsg];
      updateWindow(windowId, { messages: nextMessages });

      try {
        const history: DiscoveryAssistantMessage[] = nextMessages.slice(-12).map((entry) => ({
          role: entry.role,
          content: entry.content,
          selectedAdIds: entry.selectedAdIds,
          contextSummary: entry.contextSummary,
        }));

        const res = await fetch("/api/discovery/chat", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandId,
            brandName,
            message: messageText,
            history: history.slice(0, -1),
            selectedAdIds: selectedAdRefs.map((ad) => ad.id),
            attachments: attachments.map(attachmentInputFromChat),
            currentTab: tab,
            currentFilters: {
              search: toolbar.search,
              sort: toolbar.sort,
              format: toolbar.format,
              status: toolbar.status,
              datePreset: toolbar.datePreset,
              ultimateOnly: toolbar.ultimateOnly,
              competitorCount: toolbar.selectedCompetitorIds.size,
            },
          }),
        });

        const raw = await res.text();
        let json: DiscoveryAssistantResponse & { ok?: boolean; error?: string };
        try {
          json = JSON.parse(raw) as DiscoveryAssistantResponse & { ok?: boolean; error?: string };
        } catch {
          const snippet = raw.trim().slice(0, 240);
          if (snippet.includes("FUNCTION_INVOCATION_TIMEOUT")) {
            throw new Error("Search timed out — try fewer keywords or a shorter query.");
          }
          throw new Error(snippet || `Assistant request failed (${res.status})`);
        }
        if (!res.ok || json.ok === false) {
          throw new Error(json.error ?? "Assistant request failed");
        }

        if (json.filter_patch) {
          const patch = applyDiscoveryFilterPatch(toolbar, json.filter_patch, competitors);
          onApplyFilters(patch);
          if (json.filter_patch.tab) onSelectTab(json.filter_patch.tab);
        }

        setWindows((prev) =>
          prev.map((w) =>
            w.windowId === windowId
              ? {
                  ...w,
                  loading: false,
                  messages: [
                    ...w.messages,
                    {
                      role: "assistant",
                      content: json.message,
                      adRefs: json.ad_refs,
                      discoveryAds: json.discovery_ads,
                      visualStats: json.visual_stats,
                      suggestions: json.suggestions,
                    },
                  ],
                }
              : w,
          ),
        );
      } catch (err) {
        updateWindow(windowId, {
          loading: false,
          error: err instanceof Error ? err.message : "Something went wrong",
        });
      }
    },
    [
      windows,
      brandId,
      brandName,
      tab,
      toolbar,
      competitors,
      onApplyFilters,
      onSelectTab,
      updateWindow,
    ],
  );

  const handleDeleteSession = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      deleteDiscoveryChatSession(brandId, id);
      refreshSessions();
      setWindows((prev) => {
        const next = prev.filter((w) => w.sessionId !== id);
        if (next.length === 0) {
          const fresh = createDiscoveryChatSession(brandId);
          return [windowFromSession(fresh)];
        }
        return next;
      });
    },
    [brandId, refreshSessions],
  );

  const toggleClusterExpanded = useCallback(() => {
    setClusterExpanded((prev) => {
      const next = !prev;
      persistUi(windows, next, clusterSizeRef.current, paneWidthsRef.current);
      return next;
    });
  }, [persistUi, windows]);

  const resizeCluster = useCallback(
    (dx: number, dy: number, edge: "left" | "top" | "corner") => {
      setClusterSize((prev) => {
        const base = prev ?? getDefaultClusterSize();
        const sidebar = window.innerWidth >= 640 ? getSidebarWidthPx() : 0;
        const maxWidth = window.innerWidth - sidebar;
        const maxHeight = window.innerHeight;
        let width = base.width;
        let height = base.height;
        if (edge === "left" || edge === "corner") {
          width = clamp(base.width - dx, MIN_CLUSTER_WIDTH, maxWidth);
        }
        if (edge === "top" || edge === "corner") {
          height = clamp(base.height - dy, MIN_CLUSTER_HEIGHT, maxHeight);
        }
        const next = { width, height };
        persistUi(windows, true, next, paneWidthsRef.current);
        return next;
      });
    },
    [persistUi, windows],
  );

  const resizePaneDivider = useCallback(
    (leftSessionId: string, rightSessionId: string, dx: number) => {
      if (!panesRef.current) return;
      const containerWidth = panesRef.current.clientWidth;
      const gap = (windows.length - 1) * 8;
      const available = Math.max(MIN_PANE_WIDTH * 2, containerWidth - gap);
      const perPane = available / Math.max(1, windows.length);

      setPaneWidths((prev) => {
        const currentLeft = prev[leftSessionId] ?? perPane;
        const currentRight = prev[rightSessionId] ?? perPane;
        const nextLeft = clamp(currentLeft + dx, MIN_PANE_WIDTH, available - MIN_PANE_WIDTH);
        const nextRight = clamp(currentRight - dx, MIN_PANE_WIDTH, available - MIN_PANE_WIDTH);
        const next = {
          ...prev,
          [leftSessionId]: nextLeft,
          [rightSessionId]: nextRight,
        };
        persistUi(windows, clusterExpanded, clusterSizeRef.current, next);
        return next;
      });
    },
    [clusterExpanded, persistUi, windows],
  );

  const toggleSelectAdForWindow = useCallback((windowId: string, ad: DiscoveryAdDto) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.windowId !== windowId) return w;
        const has = w.selectedAdIds.includes(ad.id);
        const selectedAdIds = has
          ? w.selectedAdIds.filter((id) => id !== ad.id)
          : [...w.selectedAdIds, ad.id].slice(0, 8);
        return { ...w, selectedAdIds };
      }),
    );
  }, []);

  const addFilesForWindow = useCallback(async (windowId: string, files: FileList | File[]) => {
    const win = windows.find((w) => w.windowId === windowId);
    if (!win) return;
    const { attachments, errors } = await parseChatAttachmentFiles(files, win.pendingAttachments.length);
    updateWindow(windowId, {
      pendingAttachments: [...win.pendingAttachments, ...attachments],
      attachmentError: errors[0] ?? null,
    });
  }, [updateWindow, windows]);

  const useFullCluster = clusterExpanded && !clusterSize;
  const resolvedClusterSize = clusterExpanded ? (clusterSize ?? getDefaultClusterSize()) : null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={clusterRef}
          key="assistant-cluster"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
          transition={PANEL_SPRING}
          style={
            clusterExpanded && resolvedClusterSize && !useFullCluster
              ? { width: resolvedClusterSize.width, height: resolvedClusterSize.height }
              : undefined
          }
          className={cn(
            "fixed z-50 flex gap-2.5 motion-safe:transition-[left,right,bottom,width,height] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
            clusterExpanded
              ? useFullCluster
                ? "inset-0 sm:left-[var(--rival-sidebar-width,280px)] h-screen w-auto items-stretch p-2"
                : "bottom-0 right-0 items-stretch p-2"
              : "bottom-[5.25rem] right-6 max-w-[calc(100vw-1.5rem)] items-end sm:max-w-[calc(100vw-var(--rival-sidebar-width,280px)-2rem)]",
          )}
        >
          {clusterExpanded ? (
            <>
              <ClusterResizeHandle edge="left" onDrag={(dx, dy) => resizeCluster(dx, dy, "left")} />
              <ClusterResizeHandle edge="top" onDrag={(dx, dy) => resizeCluster(dx, dy, "top")} />
              <ClusterResizeHandle edge="corner" onDrag={(dx, dy) => resizeCluster(dx, dy, "corner")} />
            </>
          ) : null}
          <motion.button
            type="button"
            layout
            onClick={startNewChat}
            whileTap={reduceMotion ? undefined : { scale: 0.94 }}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-2xl",
              assistantPlusBtn,
              clusterExpanded ? "h-14 w-14 self-center" : "mb-1 h-11 w-11",
            )}
            aria-label="New chat window to the left"
            title="New chat"
          >
            <Plus className={clusterExpanded ? "h-5 w-5" : "h-4 w-4"} />
          </motion.button>

          <div
            ref={(node) => {
              scrollRef.current = node;
              panesRef.current = node;
            }}
            className={cn(
              "flex min-w-0 items-stretch gap-2.5",
              clusterExpanded
                ? "h-full min-h-0 flex-1 overflow-hidden"
                : "overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            )}
          >
            <AnimatePresence mode="popLayout">
              {windows.map((win, index) => (
                <Fragment key={win.windowId}>
                  <DiscoveryAssistantChatPane
                    win={win}
                    index={index}
                    isPrimary={index === windows.length - 1}
                    clusterExpanded={clusterExpanded}
                    paneWidth={
                      clusterExpanded && windows.length > 1 ? paneWidths[win.sessionId] : undefined
                    }
                    brandName={brandName}
                    sessions={sessions}
                    historyOpen={historyOpen}
                    isSaved={isSaved}
                    isPending={isPending}
                    reduceMotion={reduceMotion}
                    onClosePane={() => closeWindow(win.windowId)}
                    onToggleExpanded={toggleClusterExpanded}
                    onToggleHistory={() => setHistoryOpen((v) => !v)}
                    onNewChat={startNewChat}
                    onInputChange={(value) => updateWindow(win.windowId, { input: value })}
                    onSend={(text) => void sendForWindow(win.windowId, text)}
                    onOpenAd={onOpenAd}
                    onToggleSave={(ad) => void toggleSave(ad)}
                    onToggleSelectAd={(ad) => toggleSelectAdForWindow(win.windowId, ad)}
                    onAddFiles={(files) => void addFilesForWindow(win.windowId, files)}
                    onRemoveAttachment={(attachmentId) =>
                      updateWindow(win.windowId, {
                        pendingAttachments: win.pendingAttachments.filter((a) => a.id !== attachmentId),
                        attachmentError: null,
                      })
                    }
                    onClearSelectedAds={() => updateWindow(win.windowId, { selectedAdIds: [] })}
                    onRemoveSelectedAd={(adId) =>
                      updateWindow(win.windowId, {
                        selectedAdIds: win.selectedAdIds.filter((id) => id !== adId),
                      })
                    }
                    onLoadSession={loadSession}
                    onDeleteSession={handleDeleteSession}
                  />
                  {clusterExpanded && index < windows.length - 1 ? (
                    <PaneResizeDivider
                      onDrag={(dx) =>
                        resizePaneDivider(win.sessionId, windows[index + 1]!.sessionId, dx)
                      }
                    />
                  ) : null}
                </Fragment>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

type AssistantProps = Omit<PanelProps, "open" | "onClose">;

export function DiscoveryAssistant(props: AssistantProps) {
  const [open, setOpen] = useState(false);
  const [clusterExpanded, setClusterExpanded] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <>
      <DiscoveryAssistantPanel
        open={open}
        onClose={() => setOpen(false)}
        onClusterExpandedChange={setClusterExpanded}
        {...props}
      />

      <AnimatePresence>
        {!(open && clusterExpanded) ? (
          <motion.button
            key="assistant-fab"
            type="button"
            layout
            initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.9 }}
            onClick={() => setOpen((v) => !v)}
            whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            transition={PANEL_SPRING}
            className={cn(
              "fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full text-sm font-semibold text-white shadow-[0_12px_40px_-8px_rgba(52,52,52,0.38)] ring-1 ring-[color-mix(in_srgb,var(--rival-accent-blue)_40%,white)] transition hover:bg-[#2d2d44]",
              assistantPrimaryBtn,
              open ? "h-12 w-12 justify-center px-0" : "px-4 py-3",
            )}
            aria-label={open ? "Close assistant" : "Open assistant"}
            aria-expanded={open}
          >
            <AnimatePresence mode="wait" initial={false}>
              {open ? (
                <motion.span
                  key="close"
                  initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  <X className="h-5 w-5" aria-hidden />
                </motion.span>
              ) : (
                <motion.span
                  key="open"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="inline-flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Ask Claude
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </>
  );
}
