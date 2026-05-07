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
    router.push(`/dashboard/searching?${params.toString()}`, { scroll: false });
  };

  const fullQuery = inputValue.trim() ? [...termValues, inputValue.trim()].join(" ") : termValues.join(" ");

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center px-6 py-10 sm:px-10 sm:py-14">
      <div className="flex w-full max-w-2xl flex-col items-center">
        <h1 className="mb-8 flex justify-center filter drop-shadow-sm sm:mb-10">
          <RivalLogoImg className="h-12 w-auto max-w-[min(320px,88vw)] object-contain sm:h-16" />
        </h1>

        <div className="relative flex w-full flex-col items-center text-center">
          <h2 className="mb-2 text-[13px] font-bold uppercase tracking-[0.15em] text-[#808080] sm:mb-3 sm:text-[15px]">
            Find your competitor
          </h2>
          <p className="mx-auto mb-5 max-w-md text-[14px] font-medium leading-snug text-[#9ca3af] sm:mb-6">
            Enter a URL, brand name, or keyword — we&apos;ll discover their ad profiles across platforms.
          </p>

          <form
            onSubmit={handleSpy}
            className="mb-8 flex min-h-[72px] w-full flex-wrap items-center gap-2 rounded-[28px] border border-white/60 bg-white/40 p-2.5 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md transition-[background-color,box-shadow,border-color] duration-300 ease-out motion-safe:hover:bg-white/50 motion-safe:hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] focus-within:border-[#DDF1FD]/90 focus-within:bg-white/55 focus-within:shadow-[0_10px_36px_0_rgba(31,38,135,0.09)] motion-safe:focus-within:ring-2 motion-safe:focus-within:ring-[#DDF1FD]/90 motion-reduce:focus-within:outline motion-reduce:focus-within:outline-2 motion-reduce:focus-within:outline-offset-2 motion-reduce:focus-within:outline-[#DDF1FD] sm:max-w-[640px] sm:p-3"
          >
            <div className="pl-2 text-gray-500 sm:pl-3 shrink-0">
              <Search size={20} strokeWidth={2.5} />
            </div>

            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {terms.map((entry, i) => {
                const type = getDisplayType(entry);
                return (
                  <span
                    key={`${entry.value}-${i}`}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium ${TYPE_STYLES[type]}`}
                  >
                    <span className="max-w-[140px] truncate sm:max-w-[180px]" title={entry.value}>
                      {entry.value}
                    </span>
                    <button
                      type="button"
                      onClick={() => cycleTermType(i)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-black/5 bg-white/50 px-2 py-0.5 transition-colors hover:bg-white/80"
                      title="Click to change: URL, Brand, or Keyword"
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-wide">{TYPE_LABELS[type]}</span>
                      <RefreshCw size={11} className="opacity-70" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTerm(i)}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/10"
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
                  className="min-w-[120px] flex-1 border-none bg-transparent px-1 py-2 text-base font-medium tracking-wide text-[#343434] placeholder:text-gray-400 focus:outline-none sm:text-[17px]"
                />
              ) : (
                <span className="px-1 py-2 text-[13px] font-medium text-[#808080]">Remove one to add more</span>
              )}
            </div>

            <button
              type="submit"
              className="flex h-[44px] w-[80px] shrink-0 cursor-pointer items-center justify-center rounded-[20px] bg-[#343434] text-sm font-semibold tracking-wide text-white shadow-lg transition-[background-color,transform] duration-200 ease-out hover:bg-[#2a2a2a] motion-safe:active:scale-[0.98] sm:h-[48px] sm:w-[100px] sm:text-[16px]"
            >
              Spy
            </button>
          </form>

          <p className="mx-auto mb-1 max-w-lg text-[14px] font-medium leading-relaxed text-[#808080] sm:text-[15px]">
            Press{" "}
            <kbd className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[13px] text-[#343434]">Enter</kbd> to
            add each one. Wrong type? Click the label to change it.
          </p>
          {atLimit && <p className="text-[13px] font-medium text-[#a1a1aa]">{terms.length}/{MAX_TERMS} terms</p>}
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
