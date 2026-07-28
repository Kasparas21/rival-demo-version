"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUp,
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
import { aiGlassCardClass, aiSectionLabelClass } from "@/lib/ad-detail/ad-preview-analysis-styles";
import { formatRelativeTime } from "@/components/email-intelligence/email-intelligence-ui";
import type { DiscoveryAdDto } from "@/lib/discovery/types";
import { cn } from "@/lib/utils";

type PanelProps = {
  open: boolean;
  onClose: () => void;
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
};

type PersistedAssistantUi = {
  sessionIds: string[];
  activeSessionId: string | null;
  expanded?: boolean;
  expandedSessionId?: string | null;
};

const PANEL_SPRING = { type: "spring" as const, damping: 34, stiffness: 380, mass: 0.82 };
const PANE_SPRING = { type: "spring" as const, damping: 32, stiffness: 360, mass: 0.78 };
const UI_STATE_KEY = (brandId: string) => `rival_discovery_assistant_ui_${brandId}`;
const COMPACT_PANE_WIDTH = 400;

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
  };
}

function windowTitle(win: AssistantWindow, sessions: DiscoveryChatSession[]): string {
  const session = sessions.find((s) => s.id === win.sessionId);
  if (session?.title && session.title !== "New chat") return session.title;
  const firstUser = win.messages.find((m) => m.role === "user");
  if (firstUser?.content.trim()) return firstUser.content.trim().slice(0, 40);
  return "New chat";
}

type ChatPaneProps = {
  win: AssistantWindow;
  index: number;
  isPrimary: boolean;
  isExpanded: boolean;
  clusterExpanded: boolean;
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
  onSend: (text: string) => void;
  onOpenAd: (adId: string) => void;
  onToggleSave: (ad: DiscoveryAdDto) => void;
  onLoadSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
};

function DiscoveryAssistantChatPane({
  win,
  index,
  isPrimary,
  isExpanded,
  clusterExpanded,
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
  onLoadSession,
  onDeleteSession,
}: ChatPaneProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const title = windowTitle(win, sessions);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }, [win.messages, win.loading, historyOpen, reduceMotion]);

  return (
    <motion.div
      layout
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 28, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 20, scale: 0.96 }}
      transition={PANE_SPRING}
      style={isExpanded ? undefined : { width: COMPACT_PANE_WIDTH, minWidth: COMPACT_PANE_WIDTH }}
      className={cn(
        "flex h-[min(760px,calc(100vh-6rem))] shrink-0 flex-col",
        isExpanded && "min-w-[300px] flex-1",
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
            className={isExpanded ? assistantIconBtnActive : assistantIconBtn}
            aria-label={isExpanded ? "Collapse" : "Expand"}
            aria-pressed={isExpanded}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
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
                            isExpanded && "max-w-[min(560px,72%)]",
                          )
                        : "w-full",
                    )}
                  >
                    {msg.role === "user" ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className={cn("overflow-hidden rounded-2xl p-2", aiGlassCardClass)}>
                        {(msg.discoveryAds?.length ?? 0) > 0 ? (
                          <DiscoveryAssistantAdGallery
                            ads={msg.discoveryAds!}
                            isSaved={isSaved}
                            isPending={isPending}
                            onOpenAd={onOpenAd}
                            onToggleSave={(ad) => onToggleSave(ad)}
                            expanded={isExpanded}
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

            <footer className="shrink-0 border-t border-white/50 p-3">
              <div className="flex items-end gap-2 rounded-2xl border border-white/70 bg-white/45 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-md">
                <textarea
                  ref={inputRef}
                  value={win.input}
                  onChange={(e) => onInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void onSend(win.input);
                    }
                  }}
                  rows={isExpanded ? 3 : 2}
                  placeholder="Search keywords, filter ads…"
                  className="max-h-28 min-h-[2.5rem] flex-1 resize-none bg-transparent text-sm text-[color:var(--rival-primary)] outline-none placeholder:text-[color:var(--rival-muted)]"
                />
                <button
                  type="button"
                  disabled={!win.input.trim() || win.loading}
                  onClick={() => void onSend(win.input)}
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl disabled:opacity-40",
                    assistantPrimaryBtn,
                  )}
                  aria-label="Send"
                >
                  <ArrowUp className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DiscoveryAssistantPanel({
  open,
  onClose,
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
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const clusterExpanded = expandedSessionId !== null;
  const [windows, setWindows] = useState<AssistantWindow[]>([]);
  const [sessions, setSessions] = useState<DiscoveryChatSession[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    (nextWindows: AssistantWindow[], nextExpandedSessionId: string | null) => {
      const primary = nextWindows[nextWindows.length - 1];
      writePersistedUi(brandId, {
        sessionIds: nextWindows.map((w) => w.sessionId),
        activeSessionId: primary?.sessionId ?? null,
        expandedSessionId: nextExpandedSessionId,
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
        persistUi(next, expandedSessionId);
        return next;
      });
      setHistoryOpen(false);
      refreshSessions();
      window.setTimeout(() => {
        scrollRef.current?.scrollTo({ left: 0, behavior: reduceMotion ? "auto" : "smooth" });
      }, 60);
      return win;
    },
    [brandId, expandedSessionId, persistUi, refreshSessions, reduceMotion],
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
        const legacyExpanded = persisted.expanded ?? false;
        const restored =
          persisted.expandedSessionId ??
          (legacyExpanded ? loaded[loaded.length - 1]?.sessionId ?? null : null);
        setExpandedSessionId(restored);
        return;
      }
    }

    const active = sessionList[0] ?? createDiscoveryChatSession(brandId);
    const win = windowFromSession(active);
    setWindows([win]);
    setExpandedSessionId(null);
    persistUi([win], null);
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
          persistUi(next, expandedSessionId);
          return next;
        });
      }
      setHistoryOpen(false);
      refreshSessions();
    },
    [brandId, expandedSessionId, persistUi, refreshSessions, updateWindow, windows],
  );

  const closeWindow = useCallback(
    (windowId: string) => {
      if (windows.length <= 1) {
        onClose();
        return;
      }
      const closing = windows.find((w) => w.windowId === windowId);
      if (closing && expandedSessionId === closing.sessionId) {
        setExpandedSessionId(null);
      }
      setWindows((prev) => prev.filter((w) => w.windowId !== windowId));
    },
    [expandedSessionId, onClose, windows],
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
    persistUi(windows, expandedSessionId);
  }, [brandId, windows, expandedSessionId, open, persistUi, refreshSessions]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (historyOpen) setHistoryOpen(false);
        else if (expandedSessionId) setExpandedSessionId(null);
        else onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, historyOpen, expandedSessionId]);

  const sendForWindow = useCallback(
    async (windowId: string, text: string) => {
      const win = windows.find((w) => w.windowId === windowId);
      if (!win) return;
      const trimmed = text.trim();
      if (!trimmed || win.loading) return;

      updateWindow(windowId, { error: null, loading: true, input: "" });

      const userMsg: DiscoveryChatEntry = { role: "user", content: trimmed };
      const nextMessages = [...win.messages, userMsg];
      updateWindow(windowId, { messages: nextMessages });

      try {
        const history: DiscoveryAssistantMessage[] = nextMessages
          .slice(-12)
          .map(({ role, content }) => ({ role, content }));

        const res = await fetch("/api/discovery/chat", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandId,
            brandName,
            message: trimmed,
            history: history.slice(0, -1),
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

  const toggleExpandedForSession = useCallback(
    (sessionId: string) => {
      setExpandedSessionId((prev) => {
        const next = prev === sessionId ? null : sessionId;
        persistUi(windows, next);
        return next;
      });
    },
    [windows, persistUi],
  );

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="assistant-cluster"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
          transition={PANEL_SPRING}
          className={cn(
            "fixed z-50 flex items-end gap-2.5 motion-safe:transition-[left,right,bottom,width] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
            clusterExpanded
              ? "inset-y-0 right-0 left-0 sm:left-[var(--rival-sidebar-width,280px)] max-h-screen items-stretch gap-3 p-3"
              : "bottom-[5.25rem] right-6 max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-var(--rival-sidebar-width,280px)-2rem)]",
          )}
        >
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
            ref={scrollRef}
            className={cn(
              "flex min-w-0 items-stretch gap-2.5",
              clusterExpanded
                ? "h-full min-h-0 flex-1 overflow-hidden"
                : "overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            )}
          >
            <AnimatePresence mode="popLayout">
              {windows.map((win, index) => (
                <DiscoveryAssistantChatPane
                  key={win.windowId}
                  win={win}
                  index={index}
                  isPrimary={index === windows.length - 1}
                  isExpanded={expandedSessionId === win.sessionId}
                  clusterExpanded={clusterExpanded}
                  brandName={brandName}
                  sessions={sessions}
                  historyOpen={historyOpen}
                  isSaved={isSaved}
                  isPending={isPending}
                  reduceMotion={reduceMotion}
                  onClosePane={() => closeWindow(win.windowId)}
                  onToggleExpanded={() => toggleExpandedForSession(win.sessionId)}
                  onToggleHistory={() => setHistoryOpen((v) => !v)}
                  onNewChat={startNewChat}
                  onInputChange={(value) => updateWindow(win.windowId, { input: value })}
                  onSend={(text) => void sendForWindow(win.windowId, text)}
                  onOpenAd={onOpenAd}
                  onToggleSave={(ad) => void toggleSave(ad)}
                  onLoadSession={loadSession}
                  onDeleteSession={handleDeleteSession}
                />
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
  const reduceMotion = useReducedMotion();

  return (
    <>
      <DiscoveryAssistantPanel open={open} onClose={() => setOpen(false)} {...props} />

      <motion.button
        type="button"
        layout
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
    </>
  );
}
