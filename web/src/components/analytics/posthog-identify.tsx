"use client";

import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isPostHogConfigured } from "@/lib/analytics/posthog-config";

export function PostHogIdentify() {
  const posthog = usePostHog();

  useEffect(() => {
    if (!isPostHogConfigured() || !posthog) return;

    const supabase = createSupabaseBrowserClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        posthog.identify(session.user.id, {
          email: session.user.email,
        });
      } else if (event === "SIGNED_OUT") {
        posthog.reset();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [posthog]);

  return null;
}
