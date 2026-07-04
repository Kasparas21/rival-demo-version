import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createIntegrationOAuthState,
  verifyIntegrationOAuthState,
} from "@/lib/integrations/oauth-state";

describe("integration oauth state", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("round-trips a valid state", () => {
    vi.stubEnv("INTEGRATIONS_OAUTH_STATE_SECRET", "test-secret");
    const state = createIntegrationOAuthState("user-123", "settings");
    const parsed = verifyIntegrationOAuthState(state);
    expect(parsed).toEqual(
      expect.objectContaining({
        user_id: "user-123",
        return_to: "settings",
      }),
    );
    expect(parsed?.nonce).toBeTruthy();
  });

  it("rejects tampered state", () => {
    vi.stubEnv("INTEGRATIONS_OAUTH_STATE_SECRET", "test-secret");
    const state = createIntegrationOAuthState("user-123", "settings");
    expect(verifyIntegrationOAuthState(`${state}x`)).toBeNull();
  });

  it("rejects expired state", () => {
    vi.stubEnv("INTEGRATIONS_OAUTH_STATE_SECRET", "test-secret");
    vi.useFakeTimers();
    const state = createIntegrationOAuthState("user-123", "modal");
    vi.advanceTimersByTime(11 * 60 * 1000);
    expect(verifyIntegrationOAuthState(state)).toBeNull();
  });
});
