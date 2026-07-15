"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import {
  Bookmark,
  ExternalLink,
  Eye,
  Globe,
  Heart,
  Image as ImageIcon,
  Mail,
  MessageCircle,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import {
  SavedAdLibraryCard,
  SAVED_ADS_LIBRARY_GRID_CLASS,
  type SavedAdLibraryBrand,
} from "@/components/competitor/saved-hub/saved-ad-library-card";
import { EmailDetailDrawer } from "@/components/email-intelligence/EmailDetailDrawer";
import { EmailSaveButton } from "@/components/email-intelligence/EmailSaveButton";
import {
  emailTypeBadgeClass,
  formatEmailType,
  formatRelativeTime,
} from "@/components/email-intelligence/email-intelligence-ui";
import type { SavedEmailRow } from "@/lib/saved-emails/snapshot";
import { cn } from "@/lib/utils";

import {
  useCompetitorSavedHub,
  type SavedHubTab,
  type SavedLandingPageRow,
  type SavedOrganicPostRow,
} from "./use-competitor-saved-hub";

type CompetitorSavedHubProps = {
  open: boolean;
  onClose: () => void;
  competitorId: string;
  competitorLabel: string;
  brand: SavedAdLibraryBrand;
  badgeCount?: number;
  onOpenAd: (scrapedAdId: string) => void;
  onSavedChange?: () => void;
};

const MAC_OPEN_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.16, ease: MAC_OPEN_EASE } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

const panelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.968, y: -8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.2, ease: MAC_OPEN_EASE },
  },
  exit: {
    opacity: 0,
    scale: 0.982,
    y: -4,
    transition: { duration: 0.13, ease: [0.4, 0, 0.2, 1] },
  },
};

const panelVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.01 } },
  exit: { opacity: 0, transition: { duration: 0.01 } },
};

const TAB_META: Array<{
  id: SavedHubTab;
  label: string;
  icon: typeof ImageIcon;
  countKey: keyof ReturnType<typeof useCompetitorSavedHub>["counts"];
}> = [
  { id: "all", label: "All", icon: Bookmark, countKey: "total" },
  { id: "ads", label: "Ads", icon: ImageIcon, countKey: "ads" },
  { id: "emails", label: "Emails", icon: Mail, countKey: "emails" },
  { id: "organic", label: "Organic", icon: Share2, countKey: "organic" },
  { id: "landings", label: "Landings", icon: Globe, countKey: "landings" },
];

export function CompetitorSavedHub({
  open,
  onClose,
  competitorId,
  competitorLabel,
  brand,
  badgeCount = 0,
  onOpenAd,
  onSavedChange,
}: CompetitorSavedHubProps) {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<SavedHubTab>("all");
  const [emailDrawerId, setEmailDrawerId] = useState<string | null>(null);
  const [emailDrawerSavedId, setEmailDrawerSavedId] = useState<string | null>(null);

  const {
    hasLoaded,
    error,
    savedAds,
    savedEmails,
    savedOrganicPosts,
    savedLandingPages,
    counts,
    capabilities,
    refresh,
    setSavedAds,
    setSavedEmails,
    setSavedOrganicPosts,
    setSavedLandingPages,
    setCounts,
  } = useCompetitorSavedHub(competitorId, open, badgeCount);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) return;
    setTab("all");
    setEmailDrawerId(null);
    setEmailDrawerSavedId(null);
  }, [open]);

  const visibleTabs = useMemo(
    () =>
      TAB_META.filter((t) => {
        if (t.id === "all") return true;
        if (t.id === "ads") return capabilities.ads;
        if (t.id === "emails") return capabilities.emails;
        return true;
      }),
    [capabilities.ads, capabilities.emails],
  );

  const showAds = tab === "all" || tab === "ads";
  const showEmails = tab === "all" || tab === "emails";
  const showOrganic = tab === "all" || tab === "organic";
  const showLandings = tab === "all" || tab === "landings";

  const handleUnsaveAd = useCallback(
    async (savedAdId: string) => {
      const res = await fetch(`/api/saved-ads/${savedAdId}`, { method: "DELETE", credentials: "include" });
      const json = (await res.json()) as { ok?: boolean };
      if (!json.ok) return;
      setSavedAds((prev) => prev.filter((a) => a.id !== savedAdId));
      setCounts((c) => ({
        ...c,
        ads: Math.max(0, c.ads - 1),
        total: Math.max(0, c.total - 1),
      }));
      onSavedChange?.();
    },
    [onSavedChange, setCounts, setSavedAds],
  );

  const handleUnsaveEmail = useCallback(
    async (savedId: string) => {
      const res = await fetch(`/api/saved-emails/${savedId}`, { method: "DELETE", credentials: "include" });
      const json = (await res.json()) as { ok?: boolean };
      if (!json.ok) return;
      setSavedEmails((prev) => prev.filter((e) => e.id !== savedId));
      setCounts((c) => ({
        ...c,
        emails: Math.max(0, c.emails - 1),
        total: Math.max(0, c.total - 1),
      }));
      if (emailDrawerSavedId === savedId) {
        setEmailDrawerId(null);
        setEmailDrawerSavedId(null);
      }
      onSavedChange?.();
    },
    [emailDrawerSavedId, onSavedChange, setCounts, setSavedEmails],
  );

  const handleUnsaveOrganic = useCallback(
    async (savedId: string) => {
      const res = await fetch(`/api/saved-organic-posts/${savedId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean };
      if (!json.ok) return;
      setSavedOrganicPosts((prev) => prev.filter((p) => p.id !== savedId));
      setCounts((c) => ({
        ...c,
        organic: Math.max(0, c.organic - 1),
        total: Math.max(0, c.total - 1),
      }));
      onSavedChange?.();
    },
    [onSavedChange, setCounts, setSavedOrganicPosts],
  );

  const handleUnsaveLanding = useCallback(
    async (savedId: string) => {
      const res = await fetch(`/api/saved-landing-pages/${savedId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean };
      if (!json.ok) return;
      setSavedLandingPages((prev) => prev.filter((p) => p.id !== savedId));
      setCounts((c) => ({
        ...c,
        landings: Math.max(0, c.landings - 1),
        total: Math.max(0, c.total - 1),
      }));
      onSavedChange?.();
    },
    [onSavedChange, setCounts, setSavedLandingPages],
  );

  const isEmpty =
    !error &&
    counts.total === 0 &&
    counts.organic === 0 &&
    counts.landings === 0;

  const showEmptyState = isEmpty && (badgeCount === 0 || hasLoaded);
  const showResolvedContent = badgeCount === 0 || hasLoaded;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close saved collection"
            className="fixed inset-0 z-[280] bg-[#0f172a]/40"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="competitor-saved-hub-title"
            className={cn(
              "fixed z-[290] flex flex-col overflow-hidden will-change-[transform,opacity]",
              "right-2 top-[3.75rem] sm:right-4 sm:top-[4.25rem]",
              "w-[min(1200px,calc(100vw-1rem))] max-h-[min(94vh,960px)]",
              "rounded-[1.75rem] border border-slate-200/90 bg-white",
              "shadow-[0_32px_90px_-28px_rgba(15,23,42,0.42)]",
            )}
            style={{ transformOrigin: "top right" }}
            variants={reduceMotion ? panelVariantsReduced : panelVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Saved</p>
                <h2 id="competitor-saved-hub-title" className="truncate text-[18px] font-semibold text-slate-900">
                  {competitorLabel}
                </h2>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  {counts.total === 0
                    ? "Ads, emails, and more — all in one place"
                    : `${counts.total} item${counts.total === 1 ? "" : "s"} saved for this competitor`}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/70 bg-white/60 p-2 text-slate-500 transition hover:bg-white hover:text-slate-900"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 sm:px-5">
              {visibleTabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                const count = counts[t.countKey];
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition",
                      active
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-white/70 hover:text-slate-900",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                    {t.id !== "all" ? (
                      <span className={cn("tabular-nums", active ? "text-white/80" : "text-slate-400")}>
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-5 py-5 sm:px-6">
              {!hasLoaded && badgeCount > 0 && !error ? (
                <div className="flex min-h-[420px] items-center justify-center sm:min-h-[480px]">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
                </div>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  {error}
                  <button
                    type="button"
                    className="mt-2 block text-[12px] font-semibold underline"
                    onClick={() => refresh()}
                  >
                    Retry
                  </button>
                </div>
              ) : null}

              {showResolvedContent && showEmptyState ? (
                <EmptyHub competitorLabel={competitorLabel} onClose={onClose} />
              ) : null}

              {showResolvedContent && !isEmpty && showAds && savedAds.length > 0 ? (
                <HubSection title="Paid ads" count={savedAds.length}>
                  <div className={SAVED_ADS_LIBRARY_GRID_CLASS}>
                    {savedAds.map((ad) => (
                      <div key={ad.id} className="flex h-full min-h-0 flex-col">
                        <SavedAdLibraryCard
                          ad={ad}
                          brand={brand}
                          onOpen={() => {
                            if (ad.source_scraped_ad_id) {
                              onOpenAd(ad.source_scraped_ad_id);
                              onClose();
                            }
                          }}
                          onUnsave={() => void handleUnsaveAd(ad.id)}
                        />
                      </div>
                    ))}
                  </div>
                </HubSection>
              ) : null}

              {showResolvedContent && !isEmpty && showEmails && savedEmails.length > 0 ? (
                <HubSection title="Emails" count={savedEmails.length} className="mt-6">
                  <div className="space-y-2">
                    {savedEmails.map((row) => (
                      <SavedEmailHubRow
                        key={row.id}
                        row={row}
                        onOpen={() => {
                          setEmailDrawerSavedId(row.id);
                          setEmailDrawerId(row.source_competitor_email_id ?? row.id);
                        }}
                        onUnsave={() => void handleUnsaveEmail(row.id)}
                      />
                    ))}
                  </div>
                </HubSection>
              ) : null}

              {showResolvedContent && !isEmpty && showOrganic && savedOrganicPosts.length > 0 ? (
                <HubSection
                  title="Organic posts"
                  count={savedOrganicPosts.length}
                  className={savedAds.length > 0 || savedEmails.length > 0 ? "mt-6" : ""}
                >
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {savedOrganicPosts.map((post) => (
                      <SavedOrganicHubCard
                        key={post.id}
                        post={post}
                        onUnsave={() => void handleUnsaveOrganic(post.id)}
                      />
                    ))}
                  </div>
                </HubSection>
              ) : null}

              {showResolvedContent && !isEmpty && showLandings && savedLandingPages.length > 0 ? (
                <HubSection
                  title="Landing pages"
                  count={savedLandingPages.length}
                  className={
                    savedAds.length > 0 || savedEmails.length > 0 || savedOrganicPosts.length > 0
                      ? "mt-6"
                      : ""
                  }
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {savedLandingPages.map((pageRow) => (
                      <SavedLandingHubCard
                        key={pageRow.id}
                        page={pageRow}
                        onUnsave={() => void handleUnsaveLanding(pageRow.id)}
                      />
                    ))}
                  </div>
                </HubSection>
              ) : null}

              {showResolvedContent && !isEmpty && tab === "organic" && savedOrganicPosts.length === 0 ? (
                <HubTabHint body="No organic posts saved yet. Hover a post in the Organic tab and hit the bookmark." />
              ) : null}

              {showResolvedContent && !isEmpty && tab === "landings" && savedLandingPages.length === 0 ? (
                <HubTabHint body="No landing pages saved yet. Use the bookmark on any tracked page in the Website tab." />
              ) : null}

              {showResolvedContent && !isEmpty && tab === "ads" && savedAds.length === 0 ? (
                <HubTabHint body="No ads saved yet. Use the save button on any ad card in Paid Media." />
              ) : null}

              {showResolvedContent && !isEmpty && tab === "emails" && savedEmails.length === 0 ? (
                <HubTabHint body="No emails saved yet. Bookmark emails from the Email Marketing inbox." />
              ) : null}
            </div>
          </motion.div>

          <EmailDetailDrawer
            competitorId={competitorId}
            emailId={emailDrawerId}
            savedEmailId={emailDrawerSavedId}
            isSaved={Boolean(emailDrawerSavedId)}
            onToggleSave={
              emailDrawerSavedId ? () => void handleUnsaveEmail(emailDrawerSavedId) : undefined
            }
            onClose={() => {
              setEmailDrawerId(null);
              setEmailDrawerSavedId(null);
            }}
            onEmailUpdated={() => {}}
          />
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function HubSection({
  title,
  count,
  className,
  children,
}: {
  title: string;
  count: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="text-[13px] font-semibold text-slate-800">{title}</h3>
        <span className="text-[11px] font-medium text-slate-400">{count}</span>
      </div>
      {children}
    </section>
  );
}

function SavedEmailHubRow({
  row,
  onOpen,
  onUnsave,
}: {
  row: SavedEmailRow;
  onOpen: () => void;
  onUnsave: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200/90 bg-white px-3 py-3 shadow-sm">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className="truncate text-[13px] font-semibold text-slate-900">
          {row.subject?.trim() || "(no subject)"}
        </p>
        <p className="truncate text-[12px] text-slate-500">{row.from_name || row.from_email || "Unknown"}</p>
        {row.ai_summary ? (
          <p className="mt-1 line-clamp-2 text-[12px] text-slate-600">{row.ai_summary}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {row.email_type ? (
            <span
              className={cn(
                "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
                emailTypeBadgeClass(row.email_type),
              )}
            >
              {formatEmailType(row.email_type)}
            </span>
          ) : null}
          <span className="text-[11px] text-slate-400">Saved {formatRelativeTime(row.saved_at)}</span>
        </div>
      </button>
      <EmailSaveButton compact isSaved onToggle={onUnsave} />
    </div>
  );
}

function HubTabHint({ body }: { body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-[13px] text-slate-500">
      {body}
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function SavedOrganicHubCard({
  post,
  onUnsave,
}: {
  post: SavedOrganicPostRow;
  onUnsave: () => void;
}) {
  const preview = post.media_urls[0] ?? null;
  const openPost = () => {
    if (post.post_url) window.open(post.post_url, "_blank", "noopener,noreferrer");
  };
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm",
        post.post_url && "cursor-pointer hover:ring-2 hover:ring-slate-900/10",
      )}
      onClick={openPost}
    >
      <div className="relative aspect-square bg-slate-100">
        {preview ? (
          <img
            src={preview}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-3">
            <p className="line-clamp-6 text-[11px] leading-relaxed text-slate-500">
              {post.content?.slice(0, 220) || "Saved post"}
            </p>
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-700 shadow-sm">
          {post.platform}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUnsave();
          }}
          className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 text-slate-500 opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-red-600"
          aria-label="Remove from saved"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-2.5">
        <p className="line-clamp-2 text-[11px] font-medium text-slate-800">
          {post.content?.slice(0, 90) || post.author_display_name || "Saved post"}
        </p>
        <div className="mt-1.5 flex items-center gap-2.5 text-[10px] text-slate-400">
          <span className="inline-flex items-center gap-0.5">
            <Heart className="h-3 w-3" />
            {formatCount(post.likes)}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <MessageCircle className="h-3 w-3" />
            {formatCount(post.comments)}
          </span>
          {post.views > 0 ? (
            <span className="inline-flex items-center gap-0.5">
              <Eye className="h-3 w-3" />
              {formatCount(post.views)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function SavedLandingHubCard({
  page,
  onUnsave,
}: {
  page: SavedLandingPageRow;
  onUnsave: () => void;
}) {
  const preview = page.hero_screenshot_url || page.screenshot_url;
  const displayUrl = page.url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
      <a
        href={page.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        aria-label={`Open ${page.label || displayUrl}`}
      >
        <div className="relative bg-slate-100" style={{ aspectRatio: "16 / 10" }}>
          {preview ? (
            <img
              src={preview}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover object-top"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Globe className="h-8 w-8 text-slate-300" />
            </div>
          )}
        </div>
      </a>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onUnsave();
        }}
        className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 text-slate-500 opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-red-600"
        aria-label="Remove from saved"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start justify-between gap-2 p-2.5">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-slate-900">
            {page.label || displayUrl}
          </p>
          <p className="truncate text-[11px] text-slate-500">{displayUrl}</p>
        </div>
        <a
          href={page.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Visit page"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </article>
  );
}

function EmptyHub({ competitorLabel, onClose }: { competitorLabel: string; onClose: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-4 py-12 text-center sm:min-h-[480px]">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#DDF1FD]/80">
        <Bookmark className="h-8 w-8 text-slate-700" />
      </div>
      <h3 className="text-[17px] font-semibold text-slate-900">Nothing saved yet</h3>
      <p className="mt-2 max-w-md text-[13px] leading-relaxed text-slate-600">
        Bookmark ads from Paid Media, emails from Inbox, organic posts, and landing pages — everything you save
        for {competitorLabel} shows up here.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-slate-800"
      >
        Browse competitor
      </button>
    </div>
  );
}
