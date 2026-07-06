"use client";

import dynamic from "next/dynamic";

import CompetitorLoading from "./loading";

const CHUNK_RETRY_KEY = "rival-competitor-chunk-retry";

function isChunkLoadError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "ChunkLoadError" || /Loading chunk .* failed/i.test(error.message))
  );
}

function loadCompetitorContent() {
  return import("./competitor-client")
    .then((mod) => {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(CHUNK_RETRY_KEY);
      }
      return mod.CompetitorContent;
    })
    .catch((error: unknown) => {
      if (isChunkLoadError(error) && typeof window !== "undefined") {
        if (!sessionStorage.getItem(CHUNK_RETRY_KEY)) {
          sessionStorage.setItem(CHUNK_RETRY_KEY, "1");
          const url = new URL(window.location.href);
          url.searchParams.set("_chunk_retry", String(Date.now()));
          window.location.replace(url.toString());
          return new Promise<never>(() => {});
        }
        sessionStorage.removeItem(CHUNK_RETRY_KEY);
      }
      throw error;
    });
}

/** Lazy-load the heavy competitor dashboard so the route chunk compiles/serves faster in dev. */
export const CompetitorContent = dynamic(() => loadCompetitorContent(), {
  loading: () => <CompetitorLoading />,
});
