"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ComponentType } from "react";
import { memo } from "react";

import {
  FacebookLogo,
  InstagramLogo,
  LinkedInLogo,
  TikTokLogo,
  XLogo,
  YouTubeLogo,
} from "@/components/platform-logos";
import { formatEngagementCount } from "@/components/organic/organic-ui-utils";
import { CHANNEL_ORGANIC_THEME } from "@/lib/strategy-overview/map-node-sizing";
import type { OrganicChannelPlatform } from "@/lib/strategy-overview/payload-types";

export type OrganicChannelNodeData = {
  label: string;
  platform: OrganicChannelPlatform;
  postCount: number;
  postsPerWeek: number;
  avgEngagement: number;
  pairedPaidPlatform: string | null;
};

const PLATFORM_LOGOS: Record<OrganicChannelPlatform, ComponentType<{ className?: string }>> = {
  instagram: InstagramLogo,
  tiktok: TikTokLogo,
  youtube: YouTubeLogo,
  linkedin: LinkedInLogo,
  twitter: XLogo,
  facebook: FacebookLogo,
};

const theme = CHANNEL_ORGANIC_THEME;
const handleClass =
  "!h-3 !w-3 !border-2 !border-white !bg-violet-500 !opacity-100 pointer-events-none";

function OrganicChannelNodeInner({ data, selected }: NodeProps) {
  const d = data as OrganicChannelNodeData;
  const Logo = PLATFORM_LOGOS[d.platform];
  const eng = formatEngagementCount(d.avgEngagement);

  return (
    <div
      className={`relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl px-3.5 py-2.5 transition-all duration-200 cursor-pointer ${
        selected ? "scale-[1.02] ring-2 ring-violet-300/50" : "hover:scale-[1.015]"
      }`}
      style={{
        background: theme.bg,
        borderColor: theme.border,
        borderWidth: 2,
        borderStyle: "solid",
        boxShadow: selected ? theme.glow : `0 8px 28px rgba(15, 23, 42, 0.08), ${theme.glow}`,
      }}
    >
      <Handle id="bottom" type="source" position={Position.Bottom} className={handleClass} />

      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/90 shadow-sm ring-1 ring-white/80">
            <Logo className="h-4.5 w-4.5" />
          </div>
          <span className="truncate text-[13px] font-bold text-slate-900">{d.label}</span>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${theme.badge}`}
        >
          Organic
        </span>
      </div>

      <p className={`text-[22px] font-extrabold leading-none tabular-nums ${theme.metricText}`}>
        {d.postCount}
        <span className="ml-1.5 text-[13px] font-bold text-slate-600">posts</span>
      </p>
      <p className={`mt-1 line-clamp-2 text-[10px] font-semibold leading-snug ${theme.subtle}`}>
        {d.postsPerWeek > 0 ? `~${d.postsPerWeek}/wk` : "—"} · {eng} avg engagement
      </p>
    </div>
  );
}

export const OrganicChannelNode = memo(OrganicChannelNodeInner);
