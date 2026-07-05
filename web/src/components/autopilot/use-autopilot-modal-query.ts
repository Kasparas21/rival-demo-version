"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function stripAutopilotQueryParam(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("autopilot")) return;
  url.searchParams.delete("autopilot");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", next);
}

function isSettingsPath(pathname: string): boolean {
  return pathname === "/dashboard/settings" || pathname.startsWith("/dashboard/settings/");
}

type AutopilotModalScope = "settings" | "sidebar";

export function useAutopilotModalQuery(scope: AutopilotModalScope) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    const mode = searchParams.get("autopilot");
    if (!mode) return;

    const onSettingsPage = isSettingsPath(pathname);
    if (scope === "settings" && !onSettingsPage) return;
    if (scope === "sidebar" && onSettingsPage) return;

    if (mode === "open" || mode === "history") {
      setSettingsOpen(true);
      setHistoryOpen(mode === "history");
      stripAutopilotQueryParam();
    }
  }, [searchParams, pathname, scope]);

  const closeSettings = () => {
    setSettingsOpen(false);
    setHistoryOpen(false);
  };

  return {
    settingsOpen,
    historyOpen,
    openSettings: () => setSettingsOpen(true),
    openHistory: () => {
      setSettingsOpen(true);
      setHistoryOpen(true);
    },
    closeSettings,
    closeHistory: () => setHistoryOpen(false),
    setHistoryOpen,
  };
}
