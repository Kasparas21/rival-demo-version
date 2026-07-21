"use client";

import { createContext, useContext } from "react";

export type DashboardShellConfig = {
  basePath: "/dashboard" | "/preview";
  isPreviewMode: boolean;
};

const defaultConfig: DashboardShellConfig = {
  basePath: "/dashboard",
  isPreviewMode: false,
};

const DashboardShellContext = createContext<DashboardShellConfig>(defaultConfig);

export function DashboardShellProvider({
  basePath,
  isPreviewMode,
  children,
}: {
  basePath: "/dashboard" | "/preview";
  isPreviewMode: boolean;
  children: React.ReactNode;
}) {
  return (
    <DashboardShellContext.Provider value={{ basePath, isPreviewMode }}>
      {children}
    </DashboardShellContext.Provider>
  );
}

export function useDashboardShell(): DashboardShellConfig {
  return useContext(DashboardShellContext);
}

export function shellPath(basePath: string, suffix: string): string {
  const normalized = suffix.startsWith("/") ? suffix : `/${suffix}`;
  return `${basePath}${normalized}`;
}
