"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUp,
  Bot,
  History,
  Loader2,
  Maximize2,
  MessageSquare,
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
  expanded: boolean;
};

const PANEL_SPRING = { type: "spring" as const, damping: 34, stiffness: 380, mass: 0.82 };
const UI_STATE_KEY = (brandId: string) => `rival_discovery_assistant_ui_${brandId}`;

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

function windowTitle(window: AssistantWindow, sessions: DiscoveryChatSession[]): string {
  const session = sessions.find((s) => s.id === window.sessionId);
  if (session?.title && session.title !== "New chat") return session.title;
  const firstUser = window.messages.find((m) => m.role === "user");
  if (firstUser?.content.trim()) return firstUser.content.trim().slice(0, 40);
  return "New chat";
}

function DiscoveryAssistantWindowRail({
  windows,
  activeWindowId,
  sessions,
  onSelect,
  onAdd,
  onClose,
}: {
  windows: AssistantWindow[];
  activeWindowId: string | null;
  sessions: DiscoveryChatSession[];
  onSelect: (windowId: string) => void;
  onAdd: () => void;
  onClose: (windowId: string) => void;
}) {
  return (
    <div className="flex w-12 shrink-0 flex-col items-center gap-1.5 border-r border-slate-100 bg-slate-50/80 py-3">
      <button
        type="button"
        onClick={onAdd}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm transition hover:bg-emerald-600 active:scale-95"
        aria-label="New chat window"
        title="New chat"
      >
        <Plus className="h-4 w-4" />
      </button>
      <div className="flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-y-auto px-1 py-1">
        {windows.map((win, index) => {
          const active = win.windowId === activeWindowId;
          const title = windowTitle(win, sessions);
          return (
            <div key={win.windowId} className="group relative">
              <button
                type="button"
                onClick={() => onSelect(win.windowId)}
                title={title}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl border text-[11px] font-semibold transition",
                  active
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                )}
                aria-label={title}
                aria-current={active ? "true" : undefined}
              >
                {win.loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                )}
                <span className="sr-only">{title || `Chat ${index + 1}`}</span>
              </button>
              {windows.length > 1 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(win.windowId);
                  }}
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-white opacity-0 shadow transition group-hover:opacity-100"
                  aria-label={`Close ${title}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
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
  const [expanded, setExpanded] = useState(false);
  const [windows, setWindows] = useState<AssistantWindow[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<DiscoveryChatSession[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeWindow = useMemo(
    () => windows.find((w) => w.windowId === activeWindowId) ?? windows[0] ?? null,
    [windows, activeWindowId],
  );

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
    (nextWindows: AssistantWindow[], nextActiveId: string | null, nextExpanded: boolean) => {
      const active = nextWindows.find((w) => w.windowId === nextActiveId) ?? nextWindows[0];
      writePersistedUi(brandId, {
        sessionIds: nextWindows.map((w) => w.sessionId),
        activeSessionId: active?.sessionId ?? null,
        expanded: nextExpanded,
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
        const next = [...prev, win];
        persistUi(next, win.windowId, expanded);
        return next;
      });
      setActiveWindowId(win.windowId);
      setHistoryOpen(false);
      refreshSessions();
      window.setTimeout(() => inputRef.current?.focus(), 80);
      return win;
    },
    [brandId, expanded, persistUi, refreshSessions],
  );

  const startNewChat = useCallback(() => {
    addWindow();
  }, [addWindow]);

  const initWindows = useCallback(() => {
    migrateLegacyDiscoveryChat(brandId);
    refreshSessions();

    const persisted = readPersistedUi(brandId);
    const sessionList = listDiscoveryChatSessions(brandId);

    if (persisted?.sessionIds.length) {
      const loaded: AssistantWindow[] = [];
      for (const sessionId of persisted.sessionIds) {
        const session = sessionList.find((s) => s.id === sessionId) ?? loadDiscoveryChatSession(brandId, sessionId);
        if (session) loaded.push(windowFromSession(session));
      }
      if (loaded.length) {
        const active =
          loaded.find((w) => w.sessionId === persisted.activeSessionId)?.windowId ?? loaded[0]!.windowId;
        setWindows(loaded);
        setActiveWindowId(active);
        setExpanded(persisted.expanded ?? false);
        return;
      }
    }

    const active = sessionList[0] ?? createDiscoveryChatSession(brandId);
    const win = windowFromSession(active);
    setWindows([win]);
    setActiveWindowId(win.windowId);
    setExpanded(false);
    persistUi([win], win.windowId, false);
  }, [brandId, persistUi, refreshSessions]);

  const loadSession = useCallback(
    (sessionId: string) => {
      const session = loadDiscoveryChatSession(brandId, sessionId);
      if (!session) return;
      const existing = windows.find((w) => w.sessionId === sessionId);
      if (existing) {
        setActiveWindowId(existing.windowId);
        updateWindow(existing.windowId, { messages: session.messages, error: null });
      } else {
        const win = windowFromSession(session);
        setWindows((prev) => {
          const next = [...prev, win];
          persistUi(next, win.windowId, expanded);
          return next;
        });
        setActiveWindowId(win.windowId);
      }
      setHistoryOpen(false);
      refreshSessions();
    },
    [brandId, expanded, persistUi, refreshSessions, updateWindow, windows],
  );

  const closeWindow = useCallback(
    (windowId: string) => {
      setWindows((prev) => {
        if (prev.length <= 1) {
          const fresh = createDiscoveryChatSession(brandId);
          const win = windowFromSession(fresh);
          setActiveWindowId(win.windowId);
          persistUi([win], win.windowId, expanded);
          refreshSessions();
          return [win];
        }
        const next = prev.filter((w) => w.windowId !== windowId);
        const nextActiveId =
          activeWindowId === windowId ? (next[0]?.windowId ?? null) : activeWindowId;
        if (activeWindowId === windowId) {
          setActiveWindowId(nextActiveId);
        }
        persistUi(next, nextActiveId, expanded);
        return next;
      });
    },
    [activeWindowId, brandId, expanded, persistUi, refreshSessions],
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
    persistUi(windows, activeWindowId, expanded);
  }, [brandId, windows, activeWindowId, expanded, open, persistUi, refreshSessions]);

  useEffect(() => {
    if (!open || !activeWindow) return;
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    const t = window.setTimeout(() => inputRef.current?.focus(), expanded ? 120 : 280);
    return () => window.clearTimeout(t);
  }, [open, activeWindow, activeWindow?.messages, activeWindow?.loading, historyOpen, reduceMotion, expanded]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (historyOpen) setHistoryOpen(false);
        else if (expanded) setExpanded(false);
        else onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, historyOpen, expanded]);

  const send = useCallback(
    async (text: string) => {
      if (!activeWindow) return;
      const trimmed = text.trim();
      if (!trimmed || activeWindow.loading) return;

      const windowId = activeWindow.windowId;

      updateWindow(windowId, { error: null, loading: true, input: "" });

      const userMsg: DiscoveryChatEntry = { role: "user", content: trimmed };
      const nextMessages = [...activeWindow.messages, userMsg];
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
          throw new Error(raw.trim().slice(0, 240) || `Assistant request failed (${res.status})`);
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
      activeWindow,
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
      const nextId = deleteDiscoveryChatSession(brandId, id);
      refreshSessions();
      setWindows((prev) => {
        const next = prev.filter((w) => w.sessionId !== id);
        if (next.length === 0) {
          const fresh = createDiscoveryChatSession(brandId);
          const win = windowFromSession(fresh);
          setActiveWindowId(win.windowId);
          return [win];
        }
        if (prev.some((w) => w.sessionId === id && w.windowId === activeWindowId)) {
          const fallback = next.find((w) => w.sessionId === nextId) ?? next[0]!;
          setActiveWindowId(fallback.windowId);
        }
        return next;
      });
    },
    [brandId, activeWindowId, refreshSessions],
  );

  const toggleExpanded = useCallback(() => {
    setExpanded((v) => {
      const next = !v;
      persistUi(windows, activeWindowId, next);
      return next;
    });
  }, [windows, activeWindowId, persistUi]);

  const messages = activeWindow?.messages ?? [];
  const loading = activeWindow?.loading ?? false;
  const error = activeWindow?.error ?? null;
  const input = activeWindow?.input ?? "";

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          key="assistant-panel"
          role="dialog"
          aria-modal={expanded ? "true" : "false"}
          aria-label="Discovery assistant"
          layout
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 24 }}
          animate={
            reduceMotion
              ? { opacity: 1 }
              : {
                  opacity: 1,
                  scale: 1,
                  y: 0,
                }
          }
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
          transition={reduceMotion ? { duration: 0.15 } : PANEL_SPRING}
          className={cn(
            "fixed z-50 flex overflow-hidden border border-white/90 bg-white/98 shadow-[0_28px_90px_-16px_rgba(15,23,42,0.32),0_12px_40px_-12px_rgba(74,127,165,0.2)] ring-1 ring-black/[0.04] motion-safe:transition-[left,right,bottom,width,height,border-radius] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
            expanded
              ? "inset-y-0 right-0 left-0 h-screen max-h-screen rounded-none sm:left-[var(--rival-sidebar-width,280px)]"
              : "bottom-[5.25rem] right-6 left-auto h-[min(760px,calc(100vh-6rem))] w-[min(480px,calc(100vw-1.5rem))] rounded-[1.75rem]",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <DiscoveryAssistantWindowRail
            windows={windows}
            activeWindowId={activeWindow?.windowId ?? null}
            sessions={sessions}
            onSelect={setActiveWindowId}
            onAdd={startNewChat}
            onClose={closeWindow}
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                  <Bot className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">Discovery assistant</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {brandName} · {windows.length} chat{windows.length === 1 ? "" : "s"}
                    {expanded ? " · Expanded" : ""}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={startNewChat}
                  className="rounded-xl p-2 text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                  aria-label="New chat"
                  title="New chat"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={toggleExpanded}
                  className={cn(
                    "rounded-xl p-2 transition",
                    expanded
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
                  )}
                  aria-label={expanded ? "Collapse assistant" : "Expand assistant"}
                  aria-pressed={expanded}
                  title={expanded ? "Collapse" : "Expand to full width"}
                >
                  {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryOpen((v) => !v)}
                  className={cn(
                    "rounded-xl p-2 transition",
                    historyOpen
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
                  )}
                  aria-label="Chat history"
                  aria-pressed={historyOpen}
                >
                  <History className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <AnimatePresence mode="wait">
              {historyOpen ? (
                <motion.div
                  key="history"
                  initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chat history</p>
                    <button
                      type="button"
                      onClick={startNewChat}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-600"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      New chat
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {sessions.length === 0 ? (
                      <p className="px-3 py-8 text-center text-sm text-slate-500">No past chats yet.</p>
                    ) : (
                      <ul className="space-y-1">
                        {sessions.map((session) => {
                          const active = session.id === activeWindow?.sessionId;
                          return (
                            <li key={session.id}>
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => loadSession(session.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    loadSession(session.id);
                                  }
                                }}
                                className={cn(
                                  "group flex w-full cursor-pointer items-start gap-2 rounded-xl px-3 py-2.5 text-left transition",
                                  active ? "bg-slate-900 text-white" : "hover:bg-slate-50",
                                )}
                              >
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={cn(
                                      "truncate text-sm font-medium",
                                      active ? "text-white" : "text-slate-900",
                                    )}
                                  >
                                    {session.title}
                                  </p>
                                  <p
                                    className={cn(
                                      "mt-0.5 text-[11px]",
                                      active ? "text-white/70" : "text-slate-500",
                                    )}
                                  >
                                    {session.messages.length} messages · {formatRelativeTime(session.updatedAt)}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteSession(session.id, e)}
                                  className={cn(
                                    "mt-0.5 shrink-0 rounded-lg p-1.5 opacity-0 transition group-hover:opacity-100",
                                    active
                                      ? "text-white/80 hover:bg-white/10 hover:text-white"
                                      : "text-slate-400 hover:bg-red-50 hover:text-red-600",
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
                  <div
                    className={cn(
                      "flex-1 overflow-y-auto px-4 py-3",
                      expanded ? "max-w-[1400px] mx-auto w-full" : "",
                    )}
                  >
                    <div className={cn("space-y-3", expanded && "space-y-4")}>
                      {messages.length === 0 ? (
                        <motion.div
                          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.08, duration: 0.25 }}
                          className={cn("p-3", aiGlassCardClass)}
                        >
                          <p className={aiSectionLabelClass}>Try asking</p>
                          <ul
                            className={cn(
                              "mt-2 gap-1.5",
                              expanded ? "grid sm:grid-cols-2" : "space-y-1.5",
                            )}
                          >
                            {DISCOVERY_ASSISTANT_SUGGESTIONS.map((s) => (
                              <li key={s}>
                                <button
                                  type="button"
                                  onClick={() => void send(s)}
                                  className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-left text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                >
                                  {s}
                                </button>
                              </li>
                            ))}
                          </ul>
                          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                            Also available via{" "}
                            <Link href="/docs/mcp" className="font-semibold text-slate-700 underline">
                              MCP
                            </Link>{" "}
                            in Claude Desktop, Cursor, or ChatGPT.
                          </p>
                        </motion.div>
                      ) : null}

                      {messages.map((msg, i) => (
                        <motion.div
                          key={`${msg.role}-${i}-${msg.content.slice(0, 24)}`}
                          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: "spring", damping: 28, stiffness: 340 }}
                          className={cn(
                            msg.role === "user"
                              ? cn(
                                  "rounded-2xl bg-slate-900 px-3.5 py-2.5 text-sm leading-relaxed text-white",
                                  expanded ? "ml-auto max-w-[min(640px,72%)]" : "ml-8",
                                )
                              : expanded ? "w-full" : "mr-1",
                          )}
                        >
                          {msg.role === "user" ? (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          ) : (
                            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/50 p-2 shadow-sm">
                              {(msg.discoveryAds?.length ?? 0) > 0 ? (
                                <DiscoveryAssistantAdGallery
                                  ads={msg.discoveryAds!}
                                  isSaved={isSaved}
                                  isPending={isPending}
                                  onOpenAd={onOpenAd}
                                  onToggleSave={(ad) => void toggleSave(ad)}
                                  expanded={expanded}
                                />
                              ) : null}
                              <div className="px-1 pb-1 pt-2">
                                <DiscoveryAssistantVisualMessage
                                  message={msg.content}
                                  visualStats={msg.visualStats}
                                />
                                {msg.suggestions?.length ? (
                                  <div className="mt-3 flex flex-wrap gap-1.5">
                                    {msg.suggestions.map((s) => (
                                      <button
                                        key={s}
                                        type="button"
                                        onClick={() => void send(s)}
                                        className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
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

                      {loading ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-2 px-1 text-sm text-slate-500"
                        >
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          Searching competitors…
                        </motion.div>
                      ) : null}
                      {error ? <p className="text-sm text-red-600">{error}</p> : null}
                      <div ref={endRef} />
                    </div>
                  </div>

                  <footer
                    className={cn(
                      "shrink-0 border-t border-slate-100 p-3",
                      expanded ? "max-w-[1400px] mx-auto w-full" : "",
                    )}
                  >
                    <div className="flex items-end gap-2 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-2 shadow-inner">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => {
                          if (!activeWindow) return;
                          updateWindow(activeWindow.windowId, { input: e.target.value });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void send(input);
                          }
                        }}
                        rows={expanded ? 3 : 2}
                        placeholder="Search keywords, filter ads, compare competitors…"
                        className="max-h-28 min-h-[2.5rem] flex-1 resize-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        disabled={!input.trim() || loading}
                        onClick={() => void send(input)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-800 disabled:opacity-40"
                        aria-label="Send"
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </footer>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.aside>
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
          "fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-slate-900 text-sm font-semibold text-white shadow-[0_12px_40px_-8px_rgba(15,23,42,0.45)] transition-colors hover:bg-slate-800",
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
