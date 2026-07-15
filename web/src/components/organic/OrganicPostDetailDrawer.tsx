"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bookmark, BookmarkCheck, ExternalLink, X } from "lucide-react";

import { CompetitorLogo } from "@/components/shared/competitor-logo";
import { AdDetailDrawerSkeleton } from "@/components/ui/feature-skeleton";
import type { OrganicPostPreviewAnalysis } from "@/lib/organic-content/organic-post-ai-analysis-types";
import {
  fetchOrganicPostDetailPayload,
  patchCachedOrganicPostDetailAnalysis,
  type OrganicPostDetailOpenSeed,
} from "@/lib/organic-content/organic-post-detail-cache";
import {
  isFullOrganicPostDetailPayload,
} from "@/lib/organic-content/organic-post-detail-from-seed";
import { readOrganicPostDisplaySnapshot } from "@/lib/organic-content/organic-post-detail-snapshot";
import type { OrganicPostDetailData } from "@/lib/organic-content/organic-post-detail-types";
import { ORGANIC_PLATFORM_LABELS } from "@/lib/organic-content/constants";
import type { OrganicPlatform, OrganicSocials } from "@/lib/organic-content/types";
import { useSavedOrganicPosts } from "@/lib/saved-organic/use-saved-organic-posts";

import { OrganicPostAnalysisPanel, type OrganicPostAnalysisQuota } from "./OrganicPostAnalysisPanel";
import { OrganicPostCard } from "./OrganicPostCard";
import { OrganicPostDownloadBar } from "./OrganicPostDownloadBar";
import { formatEngagementCount, OrganicPlatformBadge } from "./organic-ui-utils";
import { AuthorAvatar, resolveAuthor } from "./platform-cards/shared";

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0">
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <div className="min-w-0 text-right text-[13px] text-slate-900">{children}</div>
    </div>
  );
}

function formatPostType(productType: string | null | undefined): string {
  if (!productType) return "Post";
  const map: Record<string, string> = {
    clips: "Reel / Short",
    video: "Video",
    photo: "Photo",
    carousel: "Carousel",
    document: "Document",
    text: "Text",
  };
  return map[productType.toLowerCase()] ?? productType;
}

function formatPostedDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function DetailsTab({
  data,
  socials,
}: {
  data: OrganicPostDetailData;
  socials?: OrganicSocials;
}) {
  const { post, competitor } = data;
  const author = resolveAuthor(post, socials);
  const platformLabel = ORGANIC_PLATFORM_LABELS[post.platform as OrganicPlatform] ?? post.platform;

  return (
    <div>
      <DetailRow label="Account">
        <div className="flex items-center justify-end gap-2">
          <AuthorAvatar avatarUrl={author.avatarUrl} className="h-6 w-6" />
          <span className="font-medium">{author.handleLabel ?? author.displayName ?? "—"}</span>
        </div>
      </DetailRow>
      <DetailRow label="Brand">
        <div className="flex items-center justify-end gap-2">
          <CompetitorLogo
            sources={{
              primary: competitor.logo_url,
              domain: competitor.domain ?? undefined,
            }}
            name={competitor.name}
            size="xs"
          />
          <span className="font-medium">{competitor.name}</span>
        </div>
      </DetailRow>
      <DetailRow label="Platform">
        <OrganicPlatformBadge platform={post.platform} />
        <span className="ml-2 text-[12px] text-slate-600">{platformLabel}</span>
      </DetailRow>
      <DetailRow label="Posted">{formatPostedDate(post.posted_at)}</DetailRow>
      <DetailRow label="Likes">{formatEngagementCount(post.likes)}</DetailRow>
      <DetailRow label="Comments">{formatEngagementCount(post.comments)}</DetailRow>
      <DetailRow label="Shares">{formatEngagementCount(post.shares)}</DetailRow>
      {(post.views ?? 0) > 0 ? (
        <DetailRow label="Views">{formatEngagementCount(post.views ?? 0)}</DetailRow>
      ) : null}
      <DetailRow label="Post type">{formatPostType(post.product_type)}</DetailRow>
      {post.scraped_at ? (
        <DetailRow label="Last scraped">{formatPostedDate(post.scraped_at)}</DetailRow>
      ) : null}
      {post.post_url ? (
        <DetailRow label="Post">
          <a
            href={post.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-sky-600 hover:underline"
          >
            View on {platformLabel}
            <ExternalLink className="h-3 w-3" />
          </a>
        </DetailRow>
      ) : null}
    </div>
  );
}

export function OrganicPostDetailDrawer({
  competitorId,
  postId,
  openSeed = null,
  socials,
  onClose,
}: {
  competitorId: string;
  postId: string | null;
  openSeed?: OrganicPostDetailOpenSeed | null;
  socials?: OrganicSocials;
  onClose: () => void;
}) {
  const snapshot = readOrganicPostDisplaySnapshot(competitorId, postId, openSeed);
  const [data, setData] = useState<OrganicPostDetailData | null>(() => snapshot?.data ?? null);
  const [loading, setLoading] = useState(() => !snapshot && Boolean(postId || openSeed));
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "ai">("details");
  const [mounted, setMounted] = useState(false);
  const [hydrating, setHydrating] = useState(() => snapshot?.hydrating ?? false);
  const [closing, setClosing] = useState(false);
  const [entering, setEntering] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const dismissedRef = useRef(false);
  const isOpen = Boolean(postId || openSeed);
  const showDrawer = isOpen || closing;

  const savedCheckIds = useMemo(() => {
    const id = data?.post.id ?? postId;
    return id ? [id] : [];
  }, [data?.post.id, postId]);
  const { isSaved, toggleSave, savedMap } = useSavedOrganicPosts(
    isOpen ? competitorId : "",
    savedCheckIds,
  );
  const drawerPostId = data?.post.id ?? postId ?? null;
  const drawerPostSaved = drawerPostId
    ? isSaved(drawerPostId) || Boolean(savedMap[drawerPostId])
    : false;

  useLayoutEffect(() => {
    if (isOpen) {
      dismissedRef.current = false;
      if (!wasOpenRef.current) setEntering(true);
      wasOpenRef.current = true;
    } else if (!closing) {
      wasOpenRef.current = false;
      setEntering(false);
      setClosing(false);
    }
  }, [isOpen, closing]);

  const requestClose = useCallback(() => {
    if (closing || dismissedRef.current) return;
    dismissedRef.current = true;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setEntering(false);
    setClosing(true);
    onClose();
  }, [closing, onClose]);

  useEffect(() => {
    if (!closing) return;
    const panel = panelRef.current;
    if (!panel) {
      setClosing(false);
      return;
    }
    let finished = false;
    const finishClose = () => {
      if (finished) return;
      finished = true;
      setClosing(false);
    };
    const onAnimationEnd = (event: AnimationEvent) => {
      if (event.target !== panel || event.animationName !== "ad-detail-slide-out") return;
      finishClose();
    };
    panel.addEventListener("animationend", onAnimationEnd);
    const fallback = window.setTimeout(finishClose, 380);
    return () => {
      panel.removeEventListener("animationend", onAnimationEnd);
      window.clearTimeout(fallback);
    };
  }, [closing]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (closing || dismissedRef.current) return;
    const nextSnapshot = readOrganicPostDisplaySnapshot(competitorId, postId, openSeed);
    if (nextSnapshot) {
      setData(nextSnapshot.data);
      setLoading(false);
      setHydrating(nextSnapshot.hydrating);
      setError(null);
    } else if (!postId && !openSeed) {
      setData(null);
      setLoading(false);
      setHydrating(false);
      setError(null);
    } else {
      setData(null);
      setLoading(true);
      setHydrating(false);
      setError(null);
    }
    setActiveTab("details");
  }, [competitorId, postId, openSeed, closing]);

  useEffect(() => {
    if (!postId || dismissedRef.current) return;
    let cancelled = false;

    void fetchOrganicPostDetailPayload(competitorId, postId)
      .then((res) => {
        if (cancelled || dismissedRef.current || !res) return;
        if (!isFullOrganicPostDetailPayload(res)) {
          if (!readOrganicPostDisplaySnapshot(competitorId, postId, openSeed)) {
            setError(res.error ?? "Failed to load");
            setData(null);
            setLoading(false);
          }
          setHydrating(false);
          return;
        }
        setData({
          post: res.post!,
          competitor: res.competitor!,
          context: res.context ?? {},
        });
        setError(null);
        setLoading(false);
        setHydrating(false);
      })
      .catch((err: unknown) => {
        if (cancelled || dismissedRef.current) return;
        if (!readOrganicPostDisplaySnapshot(competitorId, postId, openSeed)) {
          setError(err instanceof Error ? err.message : "Network error");
          setLoading(false);
        }
        setHydrating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [competitorId, postId, openSeed]);

  useEffect(() => {
    if (!postId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [postId, requestClose]);

  const handleAnalysisSaved = useCallback(
    (analysis: OrganicPostPreviewAnalysis, quota: OrganicPostAnalysisQuota) => {
      const computedAt = new Date().toISOString();
      patchCachedOrganicPostDetailAnalysis(competitorId, data?.post.id ?? postId ?? "", {
        preview_analysis: analysis,
        preview_analysis_computed_at: computedAt,
        preview_analysis_quota: quota,
      });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          context: {
            ...prev.context,
            preview_analysis: analysis,
            preview_analysis_computed_at: computedAt,
            preview_analysis_quota: quota,
          },
        };
      });
    },
    [competitorId, data?.post.id, postId],
  );

  if (!showDrawer) return null;
  if (!mounted) return null;

  const platformLabel = data
    ? ORGANIC_PLATFORM_LABELS[data.post.platform as OrganicPlatform] ?? data.post.platform
    : "Post preview";

  return createPortal(
    <div
      className={`fixed inset-0 z-[150] flex justify-end${closing ? " pointer-events-none" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Post preview"
    >
      <button
        type="button"
        className={`ad-detail-drawer-backdrop absolute inset-0 bg-black/40${entering ? " ad-detail-drawer-backdrop--entering" : ""}${closing ? " ad-detail-drawer-backdrop--closing" : ""}`}
        aria-label="Close"
        onClick={requestClose}
        disabled={closing}
      />

      <div
        ref={panelRef}
        className={`ad-detail-drawer-panel relative flex h-full w-full max-w-[1080px] border-l border-slate-200 bg-white shadow-2xl${entering ? " ad-detail-drawer-panel--entering" : ""}${closing ? " ad-detail-drawer-panel--closing" : ""}`}
      >
        <div className="flex w-full flex-shrink-0 flex-col">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3">
            <div className="max-w-[400px] truncate text-[13px] font-medium text-slate-700">
              {data?.post.content?.slice(0, 60) ?? (loading ? "Loading…" : "Post preview")}
            </div>
            <button
              type="button"
              onClick={requestClose}
              disabled={closing}
              className="rounded-md p-1.5 transition-colors hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-slate-600" />
            </button>
          </div>

          {loading ? <AdDetailDrawerSkeleton /> : null}

          {error && !loading && !data ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                {error}
              </div>
            </div>
          ) : null}

          {data && !loading ? (
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <div className="flex min-h-0 max-w-[640px] flex-1 flex-col items-center overflow-y-auto bg-slate-50 p-6 sm:p-8">
                <OrganicPostCard post={data.post} socials={socials} variant="standalone" />
                <OrganicPostDownloadBar
                  mediaUrls={data.post.media_urls}
                  platform={data.post.platform}
                  postId={data.post.id}
                />
              </div>

              <div className="flex w-[min(100%,400px)] flex-shrink-0 flex-col border-l border-slate-200">
                {hydrating ? (
                  <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-[10px] font-medium text-slate-500">
                    Syncing post details…
                  </div>
                ) : null}

                {data.post.post_url ? (
                  <div className="flex gap-2 border-b border-slate-100 p-4">
                    <a
                      href={data.post.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-[#343434] px-3 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#1f1f1f]"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on {platformLabel}
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        if (drawerPostId) void toggleSave(drawerPostId);
                      }}
                      aria-label={drawerPostSaved ? "Unsave post" : "Save post"}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2.5 text-[13px] font-semibold transition ${
                        drawerPostSaved
                          ? "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {drawerPostSaved ? (
                        <BookmarkCheck className="h-4 w-4" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                      {drawerPostSaved ? "Saved" : "Save"}
                    </button>
                  </div>
                ) : (
                  <div className="border-b border-slate-100 p-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (drawerPostId) void toggleSave(drawerPostId);
                      }}
                      aria-label={drawerPostSaved ? "Unsave post" : "Save post"}
                      className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-semibold transition ${
                        drawerPostSaved
                          ? "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {drawerPostSaved ? (
                        <BookmarkCheck className="h-4 w-4" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                      {drawerPostSaved ? "Saved" : "Save post"}
                    </button>
                  </div>
                )}

                <div className="flex border-b border-slate-100 px-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab("details")}
                    className={`border-b-2 px-3 py-2.5 text-[12px] font-semibold transition-colors ${
                      activeTab === "details"
                        ? "border-slate-900 text-slate-900"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("ai")}
                    className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[12px] font-semibold transition-colors ${
                      activeTab === "ai"
                        ? "border-slate-900 text-slate-900"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    AI Analysis
                    {!data.context.preview_analysis ? (
                      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-800">
                        New
                      </span>
                    ) : null}
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  {activeTab === "details" ? <DetailsTab data={data} socials={socials} /> : null}
                  {activeTab === "ai" ? (
                    <OrganicPostAnalysisPanel
                      key={data.post.id}
                      competitorId={competitorId}
                      postId={data.post.id}
                      initialAnalysis={data.context.preview_analysis ?? null}
                      initialComputedAt={data.context.preview_analysis_computed_at ?? null}
                      initialQuota={data.context.preview_analysis_quota ?? null}
                      onAnalysisSaved={handleAnalysisSaved}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
