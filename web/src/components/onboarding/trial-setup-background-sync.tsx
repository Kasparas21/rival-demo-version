"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { applyPartialOnboardingDraft } from "@/lib/onboarding/apply-draft";
import { readOnboardingDraft } from "@/lib/onboarding/draft";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Applies the guest onboarding draft after signup without blocking the plan picker UI.
 */
export function TrialSetupBackgroundSync() {
  const router = useRouter();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      const draft = readOnboardingDraft();
      if (!draft) return;

      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const result = await applyPartialOnboardingDraft(user.id, draft);
      if (result.ok) {
        router.refresh();
      }
    })();
  }, [router]);

  return null;
}
