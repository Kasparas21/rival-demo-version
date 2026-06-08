export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { shutdownPostHogServer } = await import("@/lib/analytics/posthog-server");
    process.on("beforeExit", () => {
      void shutdownPostHogServer();
    });
  }
}
