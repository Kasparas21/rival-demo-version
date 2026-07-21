"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

import { DashboardLayoutInner } from "@/components/dashboard/dashboard-layout-inner";
import { PreviewBanner } from "@/components/team/preview-banner";
import { RivalLoadingBlock } from "@/components/ui/rival-loading";
import { DashboardShellProvider } from "@/lib/dashboard/dashboard-shell-context";
import { useWorkspaceContext } from "@/lib/team/use-workspace-context";

function PreviewGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { state, loading, error } = useWorkspaceContext({ previewMode: true });

  useEffect(() => {
    if (loading) return;
    if (!state?.isGuest) {
      router.replace("/login?next=/preview/spy");
    }
  }, [loading, router, state?.isGuest]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[color:var(--rival-bg-soft,#fafafa)] px-6">
        <RivalLoadingBlock padded={false} />
      </div>
    );
  }

  if (!state?.isGuest) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[color:var(--rival-bg-soft,#fafafa)] px-6">
        <p className="text-center text-[15px] font-medium text-[#b42318]">
          {error ?? "This preview link is invalid or has expired."}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShellProvider basePath="/preview" isPreviewMode>
      <PreviewGuard>
        <Suspense
          fallback={
            <div className="flex h-screen w-full items-center justify-center bg-[color:var(--rival-bg-soft,#fafafa)] px-6">
              <RivalLoadingBlock padded={false} />
            </div>
          }
        >
          <DashboardLayoutInner previewBanner={<PreviewBanner />}>{children}</DashboardLayoutInner>
        </Suspense>
      </PreviewGuard>
    </DashboardShellProvider>
  );
}
