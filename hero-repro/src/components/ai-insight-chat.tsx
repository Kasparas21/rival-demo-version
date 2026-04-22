"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, Copy, Check, History, ChevronRight, MessageSquare } from "lucide-react";
import { BrandLogoThumb } from "@/components/brand-logo-thumb";

export type InsightCard = {
  title: string;
  body: string;
  type: "insight" | "actionable";
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  cards?: InsightCard[];
};

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
};

const STORAGE_KEY = (domain: string) => `rival_ai_chat_${domain.replace(/\./g, "_")}`;

// Mock AI response - in production this would come from an API
function getMockResponse(query: string, competitorName: string, myBrandName: string): InsightCard[] {
  const lower = query.toLowerCase();
  if (lower.includes("convert") || lower.includes("premium")) {
    return [
      {
        title: "The 'Habit Gate' Premium Trigger",
        body: `${competitorName}'s free tier is designed to create daily logging habits. Once a user has logged meals for 7+ consecutive days, they begin seeing in-app prompts for Premium features like custom macro goals and meal plans. Their retargeting ads on Meta specifically target users who've been active for 1-2 weeks but haven't upgraded — offering a time-limited 50% discount. This "habit-then-upsell" timing is their highest-converting funnel.`,
        type: "insight",
      },
      {
        title: "Social Proof at Scale",
        body: `Their ads consistently feature the "200 million users" credibility number alongside real transformation stories. On YouTube, their pre-roll ads show 15-second user testimonials with visible app screenshots. This creates a powerful flywheel: massive user count builds trust, which drives more installs. ${myBrandName} currently lacks this scale narrative in ad creative.`,
        type: "insight",
      },
      {
        title: "Actionable Takeaway",
        body: `Implement a usage-triggered upsell flow: after users complete key actions (e.g., 5 logged meals, first week streak), serve personalized upgrade prompts with limited-time pricing. Pair this with retargeting ads that mirror the in-app message for cross-channel consistency. Test "transformation story" UGC video ads featuring real users to close the social proof gap.`,
        type: "actionable",
      },
    ];
  }
  return [
    {
      title: "Strategic Insight",
      body: `Based on ${competitorName}'s ad strategy, they focus heavily on top-of-funnel acquisition. Consider analyzing their retargeting creatives to identify gaps in your own funnel.`,
      type: "insight",
    },
    {
      title: "Next Step",
      body: `Review the Ads Library tab for specific creatives, then use the Comparison tab to see how ${myBrandName} stacks up.`,
      type: "actionable",
    },
  ];
}

function formatTime(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return date.toLocaleDateString();
}

export function AIInsightChat({
  competitorName,
  competitorDomain,
  myBrandName,
  myBrandBadge,
  myBrandLogoUrl,
  myBrandColor,
}: {
  competitorName: string;
  competitorDomain: string;
  myBrandName: string;
  myBrandBadge: string;
  myBrandLogoUrl?: string;
  myBrandColor?: string;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const storageKey = STORAGE_KEY(competitorDomain);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as (Omit<Conversation, "messages"> & { messages: (Omit<ChatMessage, "timestamp"> & { timestamp: string })[] })[];
        const restored = parsed.map((c) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          messages: c.messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })),
        }));
        setConversations(restored);
        if (restored.length > 0 && !activeConversationId) {
          setActiveConversationId(restored[0].id);
        }
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(
        storageKey,
        JSON.stringify(conversations.map((c) => ({ ...c, messages: c.messages.map((m) => ({ ...m, timestamp: m.timestamp.toISOString() })) })))
      );
    }
  }, [conversations, storageKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversationId, conversations]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const hasMessages = activeConversation && activeConversation.messages.length > 0;

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    if (!overrideText) setInput("");
    setIsLoading(true);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    let conv: Conversation;
    if (activeConversationId && activeConversation) {
      conv = { ...activeConversation, messages: [...activeConversation.messages, userMsg] };
      setConversations((prev) => prev.map((c) => (c.id === conv.id ? conv : c)));
    } else {
      conv = {
        id: crypto.randomUUID(),
        title: text.slice(0, 50) + (text.length > 50 ? "…" : ""),
        messages: [userMsg],
        createdAt: new Date(),
      };
      setConversations((prev) => [conv, ...prev]);
      setActiveConversationId(conv.id);
    }

    // Simulate API delay
    await new Promise((r) => setTimeout(r, 600));

    const cards = getMockResponse(text, competitorName, myBrandName);
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      cards,
    };

    const updated = { ...conv, messages: [...conv.messages, assistantMsg] };
    setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setIsLoading(false);
    inputRef.current?.focus();
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setInput("");
    setHistoryOpen(false);
    inputRef.current?.focus();
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const suggestions = [
    "How do they convert free users to Premium?",
    "Best-performing ad creative type?",
    `How can ${myBrandName} beat ${competitorName}?`,
    "What's their retargeting strategy?",
    "Where are the gaps in their funnel?",
  ];

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* History sidebar */}
      <div
        className={`shrink-0 border-r border-white/60 bg-white/30 backdrop-blur-sm transition-all duration-200 overflow-hidden ${
          historyOpen ? "w-[240px]" : "w-0"
        }`}
      >
        <div className="w-[240px] h-full flex flex-col py-4">
          <div className="px-4 flex items-center justify-between mb-3">
            <h3 className="text-[12px] font-semibold text-[#a1a1aa] uppercase tracking-wider">Chat history</h3>
            <button
              onClick={() => setHistoryOpen(false)}
              className="p-1 rounded-lg hover:bg-white/60 text-[#a1a1aa]"
              aria-label="Close history"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          </div>
          <button
            onClick={handleNewChat}
            className="mx-3 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium text-[#343434] hover:bg-[#DDF1FD]/40 border border-dashed border-[#DDF1FD]/60 transition-colors"
          >
            <MessageSquare className="w-4 h-4" /> New chat
          </button>
          <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveConversationId(c.id);
                  setHistoryOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] transition-colors truncate ${
                  activeConversationId === c.id ? "bg-[#DDF1FD]/50 text-[#343434] font-medium" : "text-[#52525b] hover:bg-white/60"
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* History toggle bar */}
        <div className="shrink-0 flex items-center justify-between gap-4 px-4 py-2.5 border-b border-white/40 min-h-[44px]">
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              conversations.length > 0
                ? "text-[#71717a] hover:bg-white/60 hover:text-[#343434]"
                : "text-[#a1a1aa] cursor-default"
            }`}
            disabled={conversations.length === 0}
          >
            <History className="w-4 h-4 shrink-0" />
            <span>{historyOpen ? "Hide" : "History"}</span>
            {conversations.length > 0 && (
              <span className="text-[11px] bg-[#DDF1FD]/40 text-[#343434] px-1.5 py-0.5 rounded-md font-medium">
                {conversations.length}
              </span>
            )}
          </button>
          {activeConversation && (
            <span className="text-[12px] text-[#a1a1aa] shrink-0">{formatTime(activeConversation.createdAt)}</span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="max-w-[720px] mx-auto">
            {!hasMessages ? (
              <div className="flex flex-col items-center justify-center min-h-[320px] text-center">
                <div className="w-12 h-12 rounded-xl bg-[#343434] flex items-center justify-center mb-5">
                  <span className="font-serif text-[24px] font-normal text-white tracking-tight">R</span>
                </div>
                <h2 className="text-[22px] font-semibold text-[#343434] mb-1">Ask AI about {competitorName}</h2>
                <p className="text-[15px] text-[#71717a] mb-8 max-w-md">
                  Get strategic analysis on their ads, positioning, and how to compete. Ask anything.
                </p>
                <div className="flex flex-wrap justify-center gap-2 w-full max-w-[560px] mb-8">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      disabled={isLoading}
                      className="bg-white/80 border border-white/60 rounded-full px-4 py-2.5 text-[13px] font-medium text-[#52525b] hover:border-[#DDF1FD] hover:bg-[#DDF1FD]/30 hover:text-[#343434] active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {activeConversation?.messages.map((msg) =>
                  msg.role === "user" ? (
                    <div key={msg.id} className="flex items-start gap-3 justify-end">
                      <div className="flex flex-col items-end max-w-[85%] min-w-0">
                        <div className="bg-[#343434] text-white rounded-2xl rounded-tr-md px-4 py-3 text-[14px] shadow-sm">
                          {msg.content}
                        </div>
                        <p className="text-[11px] text-[#a1a1aa] mt-1 mr-1">{formatTime(msg.timestamp)}</p>
                      </div>
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/20 bg-white"
                        title={myBrandName}
                      >
                        {myBrandLogoUrl ? (
                          <BrandLogoThumb src={myBrandLogoUrl} alt={myBrandName} className="bg-white" />
                        ) : (
                          <span className="text-[11px] font-semibold" style={{ color: myBrandColor ?? "#343434" }}>{myBrandBadge}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex items-start gap-3 justify-start">
                      <div className="w-8 h-8 rounded-lg bg-[#343434] flex items-center justify-center shrink-0">
                        <span className="font-serif text-[14px] font-normal text-white tracking-tight">R</span>
                      </div>
                      <div className="flex-1 space-y-3 min-w-0">
                        {msg.cards?.map((card, i) => (
                          <div
                            key={i}
                            className={`rounded-2xl p-5 shadow-sm relative group ${
                              card.type === "actionable"
                                ? "bg-[#FFF4CB]/50 border border-[#FFF4CB]"
                                : "bg-white/80 backdrop-blur-sm border border-white/60"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 mb-2">
                                <h3
                                  className={`text-[14px] font-semibold ${
                                    card.type === "actionable" ? "text-[#8B7500]" : "text-[#343434]"
                                  }`}
                                >
                                  {card.title}
                                </h3>
                              </div>
                              <button
                                onClick={() => handleCopy(card.body, `${msg.id}-${i}`)}
                                className="p-1.5 rounded-lg hover:bg-black/5 text-[#a1a1aa] hover:text-[#343434] transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                                title="Copy"
                              >
                                {copiedId === `${msg.id}-${i}` ? (
                                  <Check className="w-3.5 h-3.5 text-[#95C14B]" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <p
                              className={`text-[14px] leading-relaxed ${
                                card.type === "actionable" ? "text-[#78350f]/90" : "text-[#52525b]"
                              }`}
                            >
                              {card.body}
                            </p>
                          </div>
                        ))}
                        <p className="text-[11px] text-[#a1a1aa] mt-1">{formatTime(msg.timestamp)}</p>
                      </div>
                    </div>
                  )
                )}
                {isLoading && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#343434] flex items-center justify-center shrink-0 flex-shrink-0">
                      <span className="font-serif text-[14px] font-normal text-white tracking-tight">R</span>
                    </div>
                    <div className="flex gap-1.5 py-4 items-center">
                      <span className="w-2 h-2 rounded-full bg-[#DDF1FD] animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-[#DDF1FD] animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-[#DDF1FD] animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0 bg-gradient-to-t from-white/80 via-white/50 to-transparent pt-4 pb-6 px-4 sm:px-6">
          <div className="max-w-[720px] mx-auto">
            <div className="relative bg-white/90 border border-white/80 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] focus-within:border-[#DDF1FD] focus-within:ring-2 focus-within:ring-[#DDF1FD]/30 transition-all backdrop-blur-sm">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Ask anything about ${competitorName}...`}
                rows={1}
                className="w-full resize-none bg-transparent pl-5 pr-14 py-4 text-[15px] text-[#343434] placeholder:text-[#a1a1aa] focus:outline-none leading-relaxed"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className={`absolute right-3 bottom-3 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  input.trim() && !isLoading
                    ? "bg-[#343434] text-white hover:bg-[#2a2a2a] shadow-sm hover:scale-105 active:scale-95"
                    : "bg-[#DDF1FD]/30 text-[#a1a1aa] cursor-not-allowed"
                }`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[12px] text-[#a1a1aa] mt-2 text-center">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
