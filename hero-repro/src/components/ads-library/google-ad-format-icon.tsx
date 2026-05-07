"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlignLeft,
  CircleHelp,
  Compass,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  Smartphone,
  ShoppingBag,
  Video,
} from "lucide-react";
import {
  googleCreativeFormatKind,
  googleCreativeFormatLabel,
  type GoogleTransparencyFormatKind,
} from "@/lib/ad-library/normalize";
import { cn } from "@/lib/utils";

const KIND_ICONS: Record<GoogleTransparencyFormatKind, LucideIcon> = {
  text: AlignLeft,
  image: ImageIcon,
  video: Video,
  shopping: ShoppingBag,
  app: Smartphone,
  discovery: Compass,
  performance_max: Layers,
  display: LayoutTemplate,
  unknown: CircleHelp,
};

/** Icon for Transparency Center format — tooltip shows full label (including unknown raw strings). */
export function GoogleAdFormatIcon({
  format,
  className,
  iconClassName,
}: {
  format?: string;
  className?: string;
  iconClassName?: string;
}) {
  const kind = googleCreativeFormatKind(format);
  const label = googleCreativeFormatLabel(format) ?? format?.trim() ?? "Format unknown";
  const Icon = KIND_ICONS[kind];

  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center", className)} title={label}>
      <Icon className={cn("h-4 w-4 text-[#5f6368]", iconClassName)} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
