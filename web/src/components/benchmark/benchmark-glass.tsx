"use client";

import type { ReactNode } from "react";

import {
  brandWorkspaceLeftAccentClass,
  brandWorkspaceShellClass,
  brandWorkspaceTopSheenClass,
} from "@/components/dashboard/brand-workspace-surfaces";
import { cn } from "@/lib/utils";

/** Page backdrop — subtle sky wash (matches own-brand header). */
export function BenchmarkAmbientBg() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-sky-50/40 via-transparent to-amber-50/20" />
    </div>
  );
}

export function GlassSheen({ className }: { className?: string }) {
  return <div className={cn(brandWorkspaceTopSheenClass, className)} aria-hidden />;
}

export function GlassPanel({
  children,
  className,
  accent = true,
}: {
  children: ReactNode;
  className?: string;
  /** Sky left bar — same as workspace per-platform cards */
  accent?: boolean;
}) {
  return (
    <div className={cn(brandWorkspaceShellClass, className)}>
      <GlassSheen />
      {accent ? <div className={brandWorkspaceLeftAccentClass} aria-hidden /> : null}
      {children}
    </div>
  );
}

export function parseAngleGap(raw: string): { label: string; hook?: string; body?: string } {
  const hookBody = raw.match(/^(.+?)\s*-\s*Hook:\s*(.+?)(?:\s+Body:\s*(.+))?$/i);
  if (hookBody) {
    return {
      label: formatAngleLabel(hookBody[1]),
      hook: hookBody[2]?.trim(),
      body: hookBody[3]?.trim(),
    };
  }
  const dash = raw.indexOf(" - ");
  if (dash > 0) {
    return { label: formatAngleLabel(raw.slice(0, dash)), hook: raw.slice(dash + 3).trim() };
  }
  return { label: formatAngleLabel(raw) };
}

function formatAngleLabel(s: string): string {
  return s
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
