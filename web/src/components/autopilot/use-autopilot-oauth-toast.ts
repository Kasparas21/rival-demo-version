"use client";

import { useEffect } from "react";
import { toast } from "sonner";

function stripOAuthQueryParams(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("connected") && !url.searchParams.has("error")) return;
  url.searchParams.delete("connected");
  url.searchParams.delete("error");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", next);
}

export function useAutopilotOAuthToast(onSuccess?: () => void): void {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");

    if (!connected && !error) return;

    if (connected === "slack") {
      toast.success("Slack connected successfully.");
      onSuccess?.();
    } else if (error === "slack_connect_failed") {
      toast.error("Couldn't connect Slack. Try again or paste a webhook URL manually.");
    }

    stripOAuthQueryParams();
  }, [onSuccess]);
}
