import type { ChannelId } from "@/components/channel-picker-modal";
import { rememberTrialPending, clearTrialPending } from "@/lib/auth/oauth-bridge-cookies";
import type { WorkspaceAdsScrapeHints } from "@/lib/onboarding/workspace-ads-setup";

export const ONBOARDING_DRAFT_STORAGE_KEY = "rival.onboarding_draft.v1";
const ONBOARDING_DRAFT_LOCAL_KEY = ONBOARDING_DRAFT_STORAGE_KEY;

export type OnboardingDraftBrandInsights = {
  ok: boolean;
  partial?: boolean;
  domain: string;
  brandName: string;
  description: string | null;
  logoUrl: string | null;
  contextSnippet: string | null;
  socials: { label: string; href: string; handle: string }[];
};

/**
 * Guest session draft. Pre-signup saves steps 1–3 only (markets/scrape use defaults).
 * Post-signup partial apply persists company + channels; regions/URLs completed after payment.
 */
export type OnboardingDraft = {
  v: 1;
  companyUrl: string;
  companyHost: string;
  workspaceChannels: ChannelId[];
  workspaceAdMarketCodes: string[];
  workspaceMarketsGlobal: boolean;
  workspaceMarketsAuto: boolean;
  companyScrape: WorkspaceAdsScrapeHints;
  brandInsights: OnboardingDraftBrandInsights | null;
};

function parseOnboardingDraft(raw: string | null): OnboardingDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as OnboardingDraft;
    if (parsed?.v !== 1 || !parsed.companyHost) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveOnboardingDraft(draft: OnboardingDraft): void {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(draft);
  try {
    sessionStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, serialized);
    localStorage.setItem(ONBOARDING_DRAFT_LOCAL_KEY, serialized);
    rememberTrialPending();
  } catch {
    /* quota / private mode */
  }
}

export function readOnboardingDraft(): OnboardingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const fromSession = parseOnboardingDraft(sessionStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY));
    if (fromSession) return fromSession;
    const fromLocal = parseOnboardingDraft(localStorage.getItem(ONBOARDING_DRAFT_LOCAL_KEY));
    if (fromLocal) {
      try {
        sessionStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify(fromLocal));
      } catch {
        /* ignore */
      }
    }
    return fromLocal;
  } catch {
    return null;
  }
}

export function clearOnboardingDraft(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
    localStorage.removeItem(ONBOARDING_DRAFT_LOCAL_KEY);
    clearTrialPending();
  } catch {
    /* ignore */
  }
}

export function hasOnboardingDraft(): boolean {
  return readOnboardingDraft() !== null;
}
