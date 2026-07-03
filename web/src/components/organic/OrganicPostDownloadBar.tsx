"use client";

import { useCallback, useState } from "react";
import { Download, Loader2 } from "lucide-react";

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.includes("video");
}

async function downloadMedia(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function DownloadButton({
  label,
  url,
  filename,
}: {
  label: string;
  url: string;
  filename: string;
}) {
  const [loading, setLoading] = useState(false);

  const onClick = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      await downloadMedia(url, filename);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setLoading(false);
    }
  }, [filename, loading, url]);

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

export function OrganicPostDownloadBar({
  mediaUrls,
  platform,
  postId,
}: {
  mediaUrls: string[];
  platform: string;
  postId: string;
}) {
  const url = mediaUrls.find((u) => u.trim())?.trim();
  if (!url) return null;

  const isVideo = isVideoUrl(url);
  const ext = isVideo ? "mp4" : "jpg";
  const filename = `${platform}-post-${postId.slice(0, 8)}.${ext}`;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      <DownloadButton label={isVideo ? "Video" : "Thumbnail"} url={url} filename={filename} />
    </div>
  );
}
