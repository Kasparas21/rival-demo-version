"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, Bot, History, Loader2, MessageSquarePlus, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";

import type { DiscoveryFeedTab, DiscoveryToolbarState } from "@/components/discovery/discovery-types";
import { DiscoveryAssistantAdGallery } from "@/components/discovery/discovery-assistant-ad-gallery";
import {
  createDiscoveryChatSession,
  deleteDiscoveryChatSession,
  ensureActiveDiscoveryChatSession,
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

const PANEL_SPRING = { type: "spring" as const, damping: 34, stiffness: 380, mass: 0.82 };

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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DiscoveryChatEntry[]>([]);
  const [sessions, setSessions] = useState<DiscoveryChatSession[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const refreshSessions = useCallback(() => {
    setSessions(listDiscoveryChatSessions(brandId));
  }, [brandId]);

  const loadSession = useCallback(
    (id: string) => {
      const session = loadDiscoveryChatSession(brandId, id);
      if (!session) return;
      setSessionId(session.id);
      setMessages(session.messages);
      setHistoryOpen(false);
      setError(null);
      refreshSessions();
    },
    [brandId, refreshSessions],
  );

  const startNewChat = useCallback(() => {
    const session = createDiscoveryChatSession(brandId);
    setSessionId(session.id);
    setMessages([]);
    setError(null);
    setHistoryOpen(false);
    refreshSessions();
    window.setTimeout(() => inputRef.current?.focus(), 80);
  }, [brandId, refreshSessions]);

  useEffect(() => {
    if (!open) return;
    migrateLegacyDiscoveryChat(brandId);
    refreshSessions();
    const active = ensureActiveDiscoveryChatSession(brandId);
    setSessionId(active.id);
    setMessages(active.messages);
  }, [open, brandId, refreshSessions]);

  useEffect(() => {
    if (!sessionId || !messages.length) return;
    saveDiscoveryChatMessages(brandId, sessionId, messages);
    refreshSessions();
  }, [brandId, sessionId, messages, refreshSessions]);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    const t = window.setTimeout(() => inputRef.current?.focus(), 280);
    return () => window.clearTimeout(t);
  }, [open, messages, loading, historyOpen, reduceMotion]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (historyOpen) setHistoryOpen(false);
        else onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, historyOpen]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      let activeId = sessionId;
      if (!activeId) {
        const session = createDiscoveryChatSession(brandId);
        activeId = session.id;
        setSessionId(activeId);
      }

      setError(null);
      setLoading(true);
      setInput("");

      const userMsg: DiscoveryChatEntry = { role: "user", content: trimmed };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);

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

        const json = (await res.json()) as DiscoveryAssistantResponse & { ok?: boolean; error?: string };
        if (!res.ok || json.ok === false) {
          throw new Error(json.error ?? "Assistant request failed");
        }

        if (json.filter_patch) {
          const patch = applyDiscoveryFilterPatch(toolbar, json.filter_patch, competitors);
          onApplyFilters(patch);
          if (json.filter_patch.tab) onSelectTab(json.filter_patch.tab);
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: json.message,
            adRefs: json.ad_refs,
            suggestions: json.suggestions,
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [
      loading,
      messages,
      sessionId,
      brandId,
      brandName,
      tab,
      toolbar,
      competitors,
      onApplyFilters,
      onSelectTab,
    ],
  );

  const handleDeleteSession = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const nextId = deleteDiscoveryChatSession(brandId, id);
      refreshSessions();
      if (sessionId === id) {
        if (nextId) loadSession(nextId);
        else startNewChat();
      }
    },
    [brandId, sessionId, loadSession, startNewChat, refreshSessions],
  );

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            key="assistant-dismiss"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="Close assistant"
            onClick={onClose}
          />

          <motion.aside
            key="assistant-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Discovery assistant"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 28 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 20 }}
            transition={reduceMotion ? { duration: 0.15 } : PANEL_SPRING}
            style={{ transformOrigin: "bottom right" }}
            className="fixed bottom-[5.25rem] right-6 z-50 flex h-[min(720px,calc(100vh-7rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[1.75rem] border border-white/90 bg-white/98 shadow-[0_28px_90px_-16px_rgba(15,23,42,0.32),0_12px_40px_-12px_rgba(74,127,165,0.2)] ring-1 ring-black/[0.04]"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                  <Bot className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">Discovery assistant</p>
                  <p className="truncate text-[11px] text-slate-500">{brandName} · AI assistant · 7 tools</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
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
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-800"
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" />
                      New chat
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {sessions.length === 0 ? (
                      <p className="px-3 py-8 text-center text-sm text-slate-500">No past chats yet.</p>
                    ) : (
                      <ul className="space-y-1">
                        {sessions.map((session) => {
                          const active = session.id === sessionId;
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
                                  active
                                    ? "bg-slate-900 text-white"
                                    : "hover:bg-slate-50",
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
                  <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                    {messages.length === 0 ? (
                      <motion.div
                        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08, duration: 0.25 }}
                        className={cn("p-3", aiGlassCardClass)}
                      >
                        <p className={aiSectionLabelClass}>Try asking</p>
                        <ul className="mt-2 space-y-1.5">
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
                          "rounded-2xl px-3.5 py-3 text-sm leading-relaxed",
                          msg.role === "user"
                            ? "ml-6 bg-slate-900 text-white"
                            : "mr-2 border border-slate-200/80 bg-white text-slate-800 shadow-sm",
                        )}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        {msg.adRefs?.length ? (
                          <DiscoveryAssistantAdGallery ads={msg.adRefs} onOpenAd={onOpenAd} />
                        ) : null}
                        {msg.role === "assistant" && msg.suggestions?.length ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {msg.suggestions.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => void send(s)}
                                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-white hover:text-slate-900"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        ) : null}
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

                  <footer className="shrink-0 border-t border-slate-100 p-3">
                    <div className="flex items-end gap-2 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-2 shadow-inner">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void send(input);
                          }
                        }}
                        rows={2}
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
          </motion.aside>
        </>
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
