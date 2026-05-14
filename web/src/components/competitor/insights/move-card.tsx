"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Lightbulb, Check } from "lucide-react";

import type { ComparisonMoveRow } from "@/lib/comparison/comparison-move-types";
import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;

function relativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return `${Math.floor(s / (86400 * 7))}w ago`;
}

function normPlatform(p: string | null): StrategyPlatform | null {
  if (!p) return null;
  const x = p.toLowerCase();
  if (x === "meta" || x === "google" || x === "tiktok" || x === "linkedin" || x === "pinterest" || x === "snapchat") {
    return x;
  }
  return null;
}

function dotClass(eventType: string): string {
  switch (eventType) {
    case "new_angle":
    case "angle_migration":
      return "bg-emerald-500";
    case "new_platform":
      return "bg-blue-500";
    case "dropped_platform":
      return "bg-red-500";
    case "budget_shift":
      return "bg-amber-500";
    case "voice_shift":
      return "bg-purple-500";
    default:
      return "bg-slate-400";
  }
}

function typeLabelUpper(eventType: string): string {
  switch (eventType) {
    case "new_angle":
      return "NEW ANGLE";
    case "angle_migration":
      return "ANGLE MIGRATION";
    case "new_platform":
      return "NEW PLATFORM";
    case "dropped_platform":
      return "DROPPED PLATFORM";
    case "budget_shift":
      return "BUDGET SHIFT";
    case "voice_shift":
      return "VOICE SHIFT";
    default:
      return eventType.toUpperCase();
  }
}

function cardTitle(m: ComparisonMoveRow): string {
  const after = m.after_state as Record<string, unknown>;
  const before = m.before_state as Record<string, unknown>;
  switch (m.event_type) {
    case "new_angle":
    case "angle_migration": {
      const hook = (after.evidenceHook as string | undefined)?.trim();
      const ang = (after.angle as string | undefined)?.trim() ?? "Creative angle";
      if (hook) {
        const one = hook.replace(/\s+/g, " ").slice(0, 90);
        return one.length < hook.length ? `${one}…` : one;
      }
      return ang;
    }
    case "new_platform":
      return `Started running ads on ${(m.platform ?? after.platform ?? "a new channel") as string}`;
    case "dropped_platform":
      return `Stopped ads on ${(m.platform ?? before.platform ?? "a channel") as string}`;
    case "budget_shift":
      return `Shifted modeled spend share on ${m.platform ?? "a platform"} (${before.pct}% → ${after.pct}%)`;
    case "voice_shift": {
      const df = Number(after.deltaFormal);
      const de = Number(after.deltaEmotional);
      const bits = [];
      if (Math.abs(df) >= 0.05) bits.push(df > 0 ? "more formal" : "more casual");
      if (Math.abs(de) >= 0.05) bits.push(de > 0 ? "more emotional" : "more rational");
      return `Voice on ${m.platform ?? "a platform"} leaned ${bits.join(", ") || "noticeably different"}`;
    }
    default:
      return typeLabelUpper(m.event_type);
  }
}

function hookLine(m: ComparisonMoveRow): string | null {
  if (m.event_type !== "new_angle" && m.event_type !== "angle_migration") return null;
  const after = m.after_state as { evidenceHook?: string | null };
  const h = after?.evidenceHook?.trim();
  return h || null;
}

type Props = {
  move: ComparisonMoveRow;
  index: number;
  competitorId: string;
  brandName: string;
  pathname: string;
  searchParamsString: string;
  angleStillActive: boolean;
};

export function MoveCard({
  move,
  index,
  competitorId,
  brandName,
  pathname,
  searchParamsString,
  angleStillActive,
}: Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveOk, setSaveOk] = useState(false);

  const pl = normPlatform(move.platform);
  const isHigh = move.significance === "high";

  const copyVaultHref = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    params.set("tab", "audience-copy");
    params.set("sub", "copy-vault");
    const ang =
      move.event_type === "new_angle" || move.event_type === "angle_migration"
        ? String((move.after_state as { angle?: string }).angle ?? "").trim()
        : "";
    if (ang) params.set("angle", ang);
    else params.delete("angle");
    return `${pathname}?${params.toString()}`;
  }, [pathname, searchParamsString, move]);

  const copyVaultBaseHref = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    params.set("tab", "audience-copy");
    params.set("sub", "copy-vault");
    params.delete("angle");
    return `${pathname}?${params.toString()}`;
  }, [pathname, searchParamsString]);

  const saveAngleBatch = useCallback(async () => {
    const ang =
      move.event_type === "new_angle" || move.event_type === "angle_migration"
        ? String((move.after_state as { angle?: string }).angle ?? "").trim()
        : "";
    if (!competitorId.trim() || !ang) return;
    setSaveBusy(true);
    try {
      const u = new URL("/api/comparison/vault-ads", window.location.origin);
      u.searchParams.set("competitorId", competitorId);
      u.searchParams.set("vault", "1");
      u.searchParams.set("angle", ang);
      u.searchParams.set("limit", "40");
      u.searchParams.set("offset", "0");
      const res = await fetch(u.toString(), { credentials: "include" });
      const json = (await res.json()) as { ok?: boolean; ads?: { id: string }[] };
      if (!json.ok || !json.ads?.length) return;
      const ids = json.ads.map((a) => a.id).slice(0, 25);
      for (const id of ids) {
        await fetch("/api/saved-ads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ competitorId, scrapedAdId: id }),
        });
      }
      setSaveOk(true);
    } finally {
      setSaveBusy(false);
    }
  }, [competitorId, move]);

  const hook = hookLine(move);
  const showSave = move.event_type === "new_angle" || move.event_type === "angle_migration";

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-5%" }}
      transition={{ duration: 0.3, delay: Math.min(index, 10) * 0.04 }}
      className={cn(
        "rounded-xl border bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md",
        isHigh
          ? "border border-slate-200/90 border-l-4 border-l-amber-400 bg-amber-50/20"
          : "border border-slate-200/90 border-l-4 border-l-slate-300"
      )}
    >
      <div className="flex flex-wrap items-start gap-2">
        {isHigh ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
            ⚡ High significance
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
            Medium
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", dotClass(move.event_type))} aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
          {typeLabelUpper(move.event_type)}
        </span>
        <span className="text-[11px] text-slate-400">·</span>
        <span className="text-[11px] tabular-nums text-slate-500">{relativeTime(move.detected_at)}</span>
        {pl ? <ComparisonPlatformIcon platform={pl} className="h-4 w-4" /> : null}
      </div>

      <p className="mt-3 text-base font-semibold leading-snug tracking-tight text-slate-900">
        {cardTitle(move)}
        {brandName && (move.event_type === "new_angle" || move.event_type === "angle_migration") ? (
          <span className="mt-1 block text-xs font-normal text-slate-500">{brandName}</span>
        ) : null}
      </p>

      {hook ? (
        <p className="mt-3 border-l-2 border-slate-300 pl-3 text-sm italic leading-relaxed text-slate-700">
          Hook: &ldquo;{hook.length > 200 ? `${hook.slice(0, 197)}…` : hook}&rdquo;
        </p>
      ) : null}

      {move.narrative?.trim() ? (
        <p className="mt-3 flex gap-2 text-sm leading-relaxed text-slate-700">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden />
          <span>{move.narrative.trim()}</span>
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {move.event_type === "new_angle" || move.event_type === "angle_migration" ? (
          angleStillActive ? (
            <Link
              href={copyVaultHref}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
            >
              See the ads
            </Link>
          ) : (
            <span className="rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
              Angle no longer active in library
            </span>
          )
        ) : (
          <Link
            href={copyVaultBaseHref}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Open copy vault
          </Link>
        )}
        {showSave ? (
          <button
            type="button"
            disabled={saveBusy || saveOk}
            onClick={() => void saveAngleBatch()}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {saveOk ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : null}
            {saveOk ? "Saved" : saveBusy ? "Saving…" : "Save this angle"}
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}

export function groupMovesByRecency(moves: ComparisonMoveRow[]): {
  thisWeek: ComparisonMoveRow[];
  lastWeek: ComparisonMoveRow[];
  earlier: ComparisonMoveRow[];
} {
  const now = Date.now();
  const thisWeek: ComparisonMoveRow[] = [];
  const lastWeek: ComparisonMoveRow[] = [];
  const earlier: ComparisonMoveRow[] = [];
  for (const m of moves) {
    const t = Date.parse(m.detected_at);
    if (!Number.isFinite(t)) continue;
    const age = now - t;
    if (age <= 7 * DAY_MS) thisWeek.push(m);
    else if (age <= 14 * DAY_MS) lastWeek.push(m);
    else earlier.push(m);
  }
  return { thisWeek, lastWeek, earlier };
}
