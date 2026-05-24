"use client";

import { SidebarCompetitorAvatar } from "@/components/sidebar-competitor-avatar";
import { CompetitorLogo } from "@/components/shared/competitor-logo";
import type { BenchmarkEntityMetrics } from "@/lib/benchmark/benchmark-types";
import type { SidebarCompetitor } from "@/lib/sidebar-competitors";
import { cn } from "@/lib/utils";

function entityToSidebarCompetitor(entity: BenchmarkEntityMetrics): SidebarCompetitor {
  return {
    slug: entity.domain,
    name: entity.name,
    logoUrl: entity.logoUrl ?? undefined,
    brand: {
      name: entity.name,
      domain: entity.domain,
      logoUrl: entity.brandLogoUrl ?? entity.logoUrl ?? undefined,
    },
  };
}

type Props = {
  entity: BenchmarkEntityMetrics;
  /** sm = 32px (tables); md = 40px; nav = sidebar-matched 48px */
  size?: "sm" | "md" | "nav";
  className?: string;
};

/** Brand logo — same sources & fallbacks as the dashboard sidebar. */
export function BenchmarkBrandLogo({ entity, size = "sm", className }: Props) {
  if (size === "nav") {
    return (
      <SidebarCompetitorAvatar
        competitor={entityToSidebarCompetitor(entity)}
        collapsed={false}
      />
    );
  }

  const logoSize = size === "md" ? "sm-plus" : "sm";

  return (
    <CompetitorLogo
      sources={{
        primary: entity.logoUrl,
        secondary: entity.brandLogoUrl,
        domain: entity.domain,
      }}
      name={entity.name}
      size={logoSize}
      shape="rounded"
      className={cn(
        "rounded-[10px] border-[#e8e8e8] bg-white shadow-sm",
        entity.isOwnBrand && "ring-2 ring-sky-200/80",
        className,
      )}
    />
  );
}
