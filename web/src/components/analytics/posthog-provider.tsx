"use client";

import type { BootstrapConfig, PostHog } from "posthog-js";
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";

import {
  getPostHogPublicKey,
  isPostHogConfigured,
  POSTHOG_BROWSER_API_HOST,
} from "@/lib/analytics/posthog-config";

type Props = {
  children: ReactNode;
  bootstrap?: BootstrapConfig;
};

type PostHogProviderComponent = ComponentType<{
  client: PostHog;
  children: ReactNode;
}>;

function mergeBootstrap(serverBootstrap?: BootstrapConfig): BootstrapConfig | undefined {
  if (!serverBootstrap?.featureFlags) return undefined;
  return { featureFlags: serverBootstrap.featureFlags };
}

export function SitePostHogProvider({ children, bootstrap }: Props) {
  const initializedRef = useRef(false);
  const posthogRef = useRef<PostHog | null>(null);
  const [posthogClient, setPosthogClient] = useState<PostHog | null>(null);
  const [Provider, setProvider] = useState<PostHogProviderComponent | null>(null);
  const [Identify, setIdentify] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (!isPostHogConfigured() || initializedRef.current) return;

    const apiKey = getPostHogPublicKey();
    if (!apiKey) return;

    const mergedBootstrap = mergeBootstrap(bootstrap);
    const onMarketingPage =
      typeof window !== "undefined" && !window.location.pathname.startsWith("/dashboard");

    const initPostHog = () => {
      if (initializedRef.current) return;

      void Promise.all([
        import("posthog-js"),
        import("posthog-js/react"),
        import("@/components/analytics/posthog-identify"),
      ]).then(([posthogModule, reactModule, identifyModule]) => {
        if (initializedRef.current) return;

        const posthog = posthogModule.default;
        posthog.init(apiKey, {
          api_host: POSTHOG_BROWSER_API_HOST,
          ui_host: "https://eu.posthog.com",
          defaults: "2026-05-30",
          person_profiles: "identified_only",
          capture_pageview: "history_change",
          capture_pageleave: true,
          persistence: "localStorage+cookie",
          bootstrap: mergedBootstrap,
          opt_out_capturing_by_default: false,
          disable_session_recording: onMarketingPage,
          session_recording: onMarketingPage
            ? undefined
            : {
                maskAllInputs: true,
              },
          advanced_disable_feature_flags: false,
        });

        initializedRef.current = true;
        posthogRef.current = posthog;
        setPosthogClient(posthog);
        setProvider(() => reactModule.PostHogProvider);
        setIdentify(() => identifyModule.PostHogIdentify);
      });
    };

    if (onMarketingPage && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => initPostHog(), { timeout: 2500 });
      return () => window.cancelIdleCallback(idleId);
    }

    initPostHog();
  }, [bootstrap]);

  if (!Provider || !posthogClient) {
    return <>{children}</>;
  }

  return (
    <Provider client={posthogClient}>
      {Identify ? <Identify /> : null}
      {children}
    </Provider>
  );
}
