"use client";

import type { HTMLAttributes, ReactNode } from "react";

export function KeepMountedTab({
  active,
  children,
  className = "",
}: {
  active: boolean;
  children: ReactNode;
  /** Extra classes on the outer wrapper (e.g. overflow). */
  className?: string;
}) {
  return (
    <div
      style={{ display: active ? "flex" : "none" }}
      className={`flex-1 min-h-0 flex-col ${className}`.trim()}
      aria-hidden={!active}
      {...(!active ? ({ inert: true } as unknown as HTMLAttributes<HTMLDivElement>) : {})}
    >
      {children}
    </div>
  );
}
