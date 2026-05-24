"use client";

import { useCallback, useState } from "react";
import { Download, Loader2 } from "lucide-react";

import {
  adDetailDownloadFilename,
  resolveAdDetailDownloadTargets,
  type AdDetailDownloadKind,
} from "@/lib/ad-detail/resolve-creative-media";

type AdLike = {
  id: string;
  platform: string;
  format: string;
  ad_creative_url: string | null;
  raw_payload: unknown;
};

async function triggerDownload(adId: string, kind: AdDetailDownloadKind, platform: string) {
  const res = await fetch(
    `/api/ad-detail/download?adId=${encodeURIComponent(adId)}&kind=${encodeURIComponent(kind)}`,
    { credentials: "include" },
  );

  if (!res.ok) {
    let message = "Download failed";
    try {
      const json = (await res.json()) as { error?: string };
      if (json.error) message = json.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/i.exec(cd);
  const filename = match?.[1] ?? adDetailDownloadFilename(kind, platform, adId);

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function DownloadButton({
  label,
  kind,
  ad,
  disabled,
}: {
  label: string;
  kind: AdDetailDownloadKind;
  ad: AdLike;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const onClick = useCallback(async () => {
    if (loading || disabled) return;
    setLoading(true);
    try {
      await triggerDownload(ad.id, kind, ad.platform);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setLoading(false);
    }
  }, [ad.id, ad.platform, disabled, kind, loading]);

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={disabled || loading}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

export function AdPreviewDownloadBar({ ad }: { ad: AdLike }) {
  const targets = resolveAdDetailDownloadTargets(ad);

  if (targets.isVideoAd) {
    if (!targets.thumbnail && !targets.video) return null;
    return (
      <div className="mt-4 flex items-center justify-center gap-4 border-t border-slate-200 pt-4">
        {targets.thumbnail ? <DownloadButton label="Thumbnail" kind="thumbnail" ad={ad} /> : null}
        {targets.video ? <DownloadButton label="Video" kind="video" ad={ad} /> : null}
      </div>
    );
  }

  if (!targets.image) return null;

  return (
    <div className="mt-4 flex items-center justify-center border-t border-slate-200 pt-4">
      <DownloadButton label="Image" kind="image" ad={ad} />
    </div>
  );
}
