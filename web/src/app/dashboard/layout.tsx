"use client";

import { Suspense } from "react";

import { DashboardLayoutInner } from "@/components/dashboard/dashboard-layout-inner";
import { RivalLoadingBlock } from "@/components/ui/rival-loading";
import { DashboardShellProvider } from "@/lib/dashboard/dashboard-shell-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShellProvider basePath="/dashboard" isPreviewMode={false}>
      <Suspense
        fallback={
          <div className="flex h-screen w-full items-center justify-center bg-[color:var(--rival-bg-soft,#fafafa)] px-6">
            <RivalLoadingBlock padded={false} />
          </div>
        }
      >
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </Suspense>
    </DashboardShellProvider>
  );
}
