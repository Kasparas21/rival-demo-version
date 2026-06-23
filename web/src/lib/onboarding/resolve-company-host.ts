import { readOnboardingDraft, type OnboardingDraft } from "@/lib/onboarding/draft";
import { isPlausiblePublicHostname, normalizedWorkspaceHost, sanitizeCompanyUrlInput } from "@/lib/onboarding/host";

/** Prefer live input, then guest draft, then saved profile — for post-signup onboarding. */
export function resolveOnboardingCompanyHost(options: {
  companyUrl?: string;
  profileCompanyUrl?: string | null;
  draft?: OnboardingDraft | null;
}): string {
  const draft =
    options.draft ?? (typeof window !== "undefined" ? readOnboardingDraft() : null);

  const candidates = [
    normalizedWorkspaceHost(sanitizeCompanyUrlInput(options.companyUrl ?? "")),
    draft?.companyHost ? normalizedWorkspaceHost(draft.companyHost) : "",
    normalizedWorkspaceHost(sanitizeCompanyUrlInput(options.profileCompanyUrl ?? "")),
  ];

  for (const host of candidates) {
    if (host && isPlausiblePublicHostname(host)) return host;
  }

  return candidates[0] ?? "";
}
