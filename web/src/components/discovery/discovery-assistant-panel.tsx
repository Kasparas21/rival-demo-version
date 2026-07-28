"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, Loader2, Sparkles, X } from "lucide-react";
import Link from "next/link";

import type { DiscoveryFeedTab, DiscoveryToolbarState } from "@/components/discovery/discovery-types";
import {
  applyDiscoveryFilterPatch,
  DISCOVERY_ASSISTANT_SUGGESTIONS,
  type DiscoveryAssistantMessage,
  type DiscoveryAssistantResponse,
} from "@/lib/discovery/discovery-assistant-types";
import {
  aiGlassCardClass,
  aiGlassShellClass,
  aiSectionLabelClass,
} from "@/lib/ad-detail/ad-preview-analysis-styles";
import { cn } from "@/lib/utils";

type Props = {
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

type ChatEntry = DiscoveryAssistantMessage & { adRefs?: DiscoveryAssistantResponse["ad_refs"] };

const STORAGE_KEY = (brandId: string) => `rival_discovery_chat_${brandId}`;

export function DiscoveryAssistantPanel({
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
}: Props) {
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY(brandId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as ChatEntry[];
      if (Array.isArray(parsed)) setMessages(parsed.slice(-40));
    } catch {
      /* ignore */
    }
  }, [brandId]);

  useEffect(() => {
    if (!messages.length) return;
    try {
      localStorage.setItem(STORAGE_KEY(brandId), JSON.stringify(messages.slice(-40)));
    } catch {
      /* ignore */
    }
  }, [brandId, messages]);

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [open, messages, loading]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError(null);
      setLoading(true);
      setInput("");

      const userMsg: ChatEntry = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const history: DiscoveryAssistantMessage[] = [...messages, userMsg]
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
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, brandId, brandName, tab, toolbar, competitors, onApplyFilters, onSelectTab],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-[2px]">
      <button type="button" className="absolute inset-0" aria-label="Close assistant" onClick={onClose} />
      <aside
        className={cn(
          "relative flex h-full w-full max-w-md flex-col border-l border-white/60 shadow-2xl",
          aiGlassShellClass,
        )}
      >
        <header className="flex items-center justify-between gap-2 border-b border-white/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Bot className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Discovery assistant</p>
              <p className="text-[11px] text-slate-500">{brandName} · Claude Opus 5 · 7 tools</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white/60 hover:text-slate-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.length === 0 ? (
            <div className={cn("p-3", aiGlassCardClass)}>
              <p className={aiSectionLabelClass}>Try asking</p>
              <ul className="mt-2 space-y-1.5">
                {DISCOVERY_ASSISTANT_SUGGESTIONS.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => void send(s)}
                      className="w-full rounded-lg border border-slate-200/80 bg-white/70 px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-white"
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
                in Claude Desktop, Cursor, or ChatGPT with 7 discovery tools.
              </p>
            </div>
          ) : null}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "rounded-xl px-3 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "ml-8 bg-slate-900 text-white"
                  : cn("mr-4 border border-white/70 bg-white/65 text-slate-700", aiGlassCardClass),
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.adRefs?.length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {msg.adRefs.map((ad) => (
                    <button
                      key={ad.id}
                      type="button"
                      onClick={() => onOpenAd(ad.id)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-left text-[10px] text-slate-700 hover:bg-slate-100"
                    >
                      <span className="font-semibold">{ad.competitor_name}</span>
                      <span className="mt-0.5 block line-clamp-2 text-slate-500">{ad.preview}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          {loading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Searching competitors…
            </div>
          ) : null}
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div ref={endRef} />
        </div>

        <footer className="border-t border-white/50 p-3">
          <div className="flex items-end gap-2 rounded-xl border border-slate-200/80 bg-white/80 p-2 shadow-sm">
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white disabled:opacity-40"
              aria-label="Send"
            >
              <ArrowUp className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}

export function DiscoveryAssistantFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800"
    >
      <Sparkles className="h-4 w-4" aria-hidden />
      Ask Claude
    </button>
  );
}
