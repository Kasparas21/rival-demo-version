"use client";
import React, { useState, useRef, KeyboardEvent } from "react";
import { Search, X, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChannelPickerModal, CHANNELS, type ChannelId } from "@/components/channel-picker-modal";
import { RivalLogoImg } from "@/components/rival-logo";
import { saveSearchToAccount } from "@/lib/account/client";

type TermType = "url" | "brand" | "keyword";

const GENERIC_WORDS = new Set([
  "food", "shop", "store", "buy", "sell", "tech", "technology", "company", "business", "online",
  "web", "app", "market", "retail", "brand", "product", "service", "best", "top", "free",
  "cheap", "sale", "deal", "price", "review", "news", "blog", "home", "about", "contact",
  "search", "find", "get", "make", "go", "see", "new", "old", "big", "small", "good", "best",
  "sport", "sports", "fashion", "clothing", "electronics", "health", "fitness", "travel",
]);

function getTermType(term: string): TermType {
  const t = term.trim().toLowerCase();
  if (/^https?:\/\//i.test(t) || /^[a-z0-9][a-z0-9-]*\.[a-z]{2,}(\/.*)?$/i.test(t)) return "url";
  const words = t.split(/\s+/);
  if (words.length === 1 && t.length > 2 && !GENERIC_WORDS.has(t)) return "brand";
  return "keyword";
}

const TYPE_LABELS: Record<TermType, string> = { url: "URL", brand: "Brand", keyword: "Keyword" };
const TYPE_ORDER: TermType[] = ["keyword", "brand", "url"];
const TYPE_STYLES: Record<TermType, string> = {
  url: "bg-[#DDF1FD]/60 text-[#1e6fa8] border-[#DDF1FD]",
  brand: "bg-[#FFF4CB]/60 text-[#a67c00] border-[#FFF4CB]",
  keyword: "bg-gray-100 text-[#6b7280] border-gray-200",
};

type TermEntry = { value: string; typeOverride?: TermType };

const MAX_TERMS = 8;

export default function SpyOnCompetitorPage() {
  const [terms, setTerms] = useState<TermEntry[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showChannelPicker, setShowChannelPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const addTerm = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (terms.length >= MAX_TERMS) return;
    if (terms.some((t) => t.value === trimmed)) return;
    setTerms((prev) => [...prev, { value: trimmed }]);
    setInputValue("");
  };

  const atLimit = terms.length >= MAX_TERMS;

  const removeTerm = (index: number) => {
    setTerms((prev) => prev.filter((_, i) => i !== index));
  };

  const cycleTermType = (index: number) => {
    setTerms((prev) => {
      const entry = prev[index];
      const current = entry.typeOverride ?? getTermType(entry.value);
      const idx = TYPE_ORDER.indexOf(current);
      const next = TYPE_ORDER[(idx + 1) % TYPE_ORDER.length];
      return prev.map((t, i) => (i === index ? { ...t, typeOverride: next } : t));
    });
  };

  const getDisplayType = (entry: TermEntry) => entry.typeOverride ?? getTermType(entry.value);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTerm(inputValue);
    } else if (e.key === "Backspace" && !inputValue && terms.length > 0) {
      removeTerm(terms.length - 1);
    }
  };

  const termValues = terms.map((t) => t.value);

  const handleSpy = (e: React.FormEvent) => {
    e.preventDefault();
    const pending = inputValue.trim();
    const query = pending ? [...termValues, pending].join(" ") : termValues.join(" ");
    if (!query.trim()) return;
    if (pending && terms.length < MAX_TERMS && !terms.some((t) => t.value === pending)) {
      setTerms((prev) => [...prev, { value: pending }]);
    }
    setInputValue("");
    setShowChannelPicker(true);
  };

  const handleChannelsConfirm = (selectedChannels: ChannelId[]) => {
    const pending = inputValue.trim();
    const base =
      pending && !terms.some((t) => t.value === pending) && terms.length < MAX_TERMS
        ? [...terms, { value: pending }]
        : terms;
    const seen = new Set<string>();
    const allEntries = base.filter((t) => {
      const v = t.value.trim();
      if (!v || seen.has(v)) return false;
      seen.add(v);
      return true;
    });
    const query = allEntries.map((t) => t.value).join(" ").trim() || pending;
    if (!query.trim()) return;
    const termPayload = allEntries.map((t) => ({
      value: t.value.trim(),
      kind: getDisplayType(t),
    }));
    const params = new URLSearchParams({ q: query.trim() });
    if (termPayload.length > 0) {
      params.set("terms", JSON.stringify(termPayload));
    }
    if (selectedChannels.length < CHANNELS.length) {
      params.set("channels", selectedChannels.join(","));
    }
    void saveSearchToAccount({
      query: query.trim(),
      terms: termPayload,
      channels: selectedChannels,
    });
    setInputValue("");
    router.push(`/dashboard/searching?${params.toString()}`);
  };

  const fullQuery = inputValue.trim() ? [...termValues, inputValue.trim()].join(" ") : termValues.join(" ");

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 h-full min-h-screen">
      <div className="w-full max-w-2xl flex flex-col items-center mt-[-6vh] sm:mt-[-10vh]">
        <h1 className="mb-[5vh] sm:mb-[6vh] flex justify-center filter drop-shadow-sm">
          <RivalLogoImg className="h-12 w-auto max-w-[min(320px,88vw)] object-contain sm:h-16" />
        </h1>

        <div className="w-full text-center flex flex-col items-center relative">
          <h2 className="text-[13px] sm:text-[15px] font-bold tracking-[0.15em] text-[#808080] uppercase mb-2 sm:mb-3">
            Find your competitor
          </h2>
          <p className="text-[14px] text-[#9ca3af] font-medium max-w-md mx-auto mb-5 sm:mb-6 leading-snug">
            Enter a URL, brand name, or keyword — we&apos;ll discover their ad profiles across platforms.
          </p>

          <form
            onSubmit={handleSpy}
            className="w-full sm:max-w-[640px] mb-8 min-h-[72px] flex flex-wrap items-center gap-2 p-2.5 sm:p-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] rounded-[28px] bg-white/40 backdrop-blur-md border border-white/60 transition-all duration-300 hover:bg-white/50 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] focus-within:ring-4 focus-within:ring-[#DDF1FD] focus-within:border-[#DDF1FD] focus-within:bg-white/60"
          >
            <div className="pl-2 sm:pl-3 text-gray-500 shrink-0">
              <Search size={20} strokeWidth={2.5} />
            </div>

            <div className="flex-1 flex flex-wrap items-center gap-2 min-w-0">
              {terms.map((entry, i) => {
                const type = getDisplayType(entry);
                return (
                  <span
                    key={`${entry.value}-${i}`}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium border ${TYPE_STYLES[type]}`}
                  >
                    <span className="truncate max-w-[140px] sm:max-w-[180px]" title={entry.value}>
                      {entry.value}
                    </span>
                    <button
                      type="button"
                      onClick={() => cycleTermType(i)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/50 hover:bg-white/80 transition-colors cursor-pointer border border-black/5"
                      title="Click to change: URL, Brand, or Keyword"
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-wide">
                        {TYPE_LABELS[type]}
                      </span>
                      <RefreshCw size={11} className="opacity-70" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTerm(i)}
                      className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors shrink-0"
                      aria-label={`Remove ${entry.value}`}
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  </span>
                );
              })}
              {!atLimit ? (
                <input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={terms.length === 0 ? "Enter a URL, brand name, or keyword" : "Add more..."}
                  type="text"
                  className="flex-1 min-w-[120px] bg-transparent border-none text-[#343434] py-2 px-1 text-base sm:text-[17px] focus:outline-none placeholder:text-gray-400 font-medium tracking-wide"
                />
              ) : (
                <span className="text-[13px] text-[#808080] font-medium py-2 px-1">
                  Remove one to add more
                </span>
              )}
            </div>

            <button
              type="submit"
              className="flex items-center justify-center shrink-0 h-[44px] sm:h-[48px] w-[80px] sm:w-[100px] rounded-[20px] bg-[#343434] text-white font-semibold shadow-lg hover:bg-[#2a2a2a] hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer text-sm sm:text-[16px] tracking-wide"
            >
              Spy
            </button>
          </form>

          <p className="text-[14px] sm:text-[15px] text-[#808080] font-medium max-w-lg mx-auto leading-relaxed mb-1">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/80 text-[#343434] font-mono text-[13px]">Enter</kbd> to add each one. Wrong type? Click the label to change it.
          </p>
          {atLimit && (
            <p className="text-[13px] text-[#a1a1aa] font-medium">
              {terms.length}/{MAX_TERMS} terms
            </p>
          )}
        </div>
      </div>

      <ChannelPickerModal
        isOpen={showChannelPicker}
        onClose={() => setShowChannelPicker(false)}
        onConfirm={handleChannelsConfirm}
        competitorQuery={fullQuery.trim()}
      />
    </div>
  );
}
