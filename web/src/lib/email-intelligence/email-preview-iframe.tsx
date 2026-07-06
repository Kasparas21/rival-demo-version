"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const MIN_HEIGHT_PX = 320;
const MAX_HEIGHT_PX = 4000;

export function EmailPreviewLoading({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[min(480px,70vh)] w-full flex-col items-center justify-center gap-3 bg-slate-100",
        className,
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      <p className="text-[13px] font-medium text-slate-500">Loading email preview…</p>
      <div className="mt-4 w-full max-w-md space-y-3 px-8">
        <div className="h-3 animate-pulse rounded-full bg-slate-200/90" />
        <div className="h-3 w-4/5 animate-pulse rounded-full bg-slate-200/80" />
        <div className="mx-auto mt-6 h-40 w-full max-w-xs animate-pulse rounded-xl bg-slate-200/70" />
        <div className="h-3 animate-pulse rounded-full bg-slate-200/80" />
        <div className="h-3 w-3/5 animate-pulse rounded-full bg-slate-200/70" />
      </div>
    </div>
  );
}

export function resizeEmailPreviewIframe(iframe: HTMLIFrameElement | null): void {
  if (!iframe) return;
  try {
    const doc = iframe.contentDocument;
    if (!doc?.documentElement) return;
    const height = Math.min(
      MAX_HEIGHT_PX,
      Math.max(MIN_HEIGHT_PX, doc.documentElement.scrollHeight, doc.body?.scrollHeight ?? 0),
    );
    iframe.style.height = `${height}px`;
  } catch {
    iframe.style.height = `${MIN_HEIGHT_PX}px`;
  }
}

const IFRAME_READY_FALLBACK_MS = 3500;

export function EmailPreviewIframe({
  title,
  htmlBody,
}: {
  title: string;
  htmlBody: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    const fallback = window.setTimeout(() => {
      setReady(true);
      resizeEmailPreviewIframe(iframeRef.current);
    }, IFRAME_READY_FALLBACK_MS);
    return () => window.clearTimeout(fallback);
  }, [htmlBody]);

  const handleLoad = useCallback(() => {
    const resize = () => resizeEmailPreviewIframe(iframeRef.current);
    resize();
    window.setTimeout(resize, 120);
    window.setTimeout(resize, 600);
    window.setTimeout(resize, 1500);
    setReady(true);
  }, []);

  return (
    <div className="relative w-full bg-white">
      {!ready ? <EmailPreviewLoading className="absolute inset-0 z-10 min-h-[min(480px,70vh)]" /> : null}
      <iframe
        ref={iframeRef}
        title={title}
        sandbox="allow-same-origin"
        srcDoc={htmlBody}
        onLoad={handleLoad}
        className={cn(
          "block min-h-[320px] w-full border-0 bg-white transition-opacity duration-200",
          ready ? "opacity-100" : "opacity-0",
        )}
        style={{ height: MIN_HEIGHT_PX }}
      />
    </div>
  );
}
