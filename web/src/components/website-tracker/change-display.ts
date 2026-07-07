import type { Json } from "@/lib/supabase/types";

import type { ChangeAnalysis } from "./types";

export type PageTextSnapshot = {
  headline?: string;
  subheadline?: string;
  cta_text?: string;
  pricing_tiers?: string[];
};

export type ElementChange = {
  id: "headline" | "subheadline" | "cta" | "pricing";
  label: string;
  before: string;
  after: string;
};

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  cta: "Call to action",
  pricing: "Pricing",
  social_proof: "Social proof",
  nav: "Navigation",
  footer: "Footer",
};

export function parsePageTextSnapshot(raw: Json | null | undefined): PageTextSnapshot {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const pricing = o.pricing_tiers;
  return {
    headline: typeof o.headline === "string" ? o.headline : undefined,
    subheadline: typeof o.subheadline === "string" ? o.subheadline : undefined,
    cta_text: typeof o.cta_text === "string" ? o.cta_text : undefined,
    pricing_tiers: Array.isArray(pricing)
      ? pricing.filter((v): v is string => typeof v === "string")
      : undefined,
  };
}

function textSimilarity(a: string, b: string): number {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (!left && !right) return 1;
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) {
    const shorter = Math.min(left.length, right.length);
    const longer = Math.max(left.length, right.length);
    return shorter / longer;
  }
  const maxLen = Math.max(left.length, right.length);
  let matches = 0;
  const limit = Math.min(left.length, right.length);
  for (let i = 0; i < limit; i++) {
    if (left[i] === right[i]) matches += 1;
  }
  return matches / maxLen;
}

export function getElementChanges(
  prev: PageTextSnapshot,
  next: PageTextSnapshot,
): ElementChange[] {
  const changes: ElementChange[] = [];

  const headlineBefore = prev.headline?.trim() ?? "";
  const headlineAfter = next.headline?.trim() ?? "";
  if (headlineBefore !== headlineAfter && (headlineBefore || headlineAfter)) {
    changes.push({
      id: "headline",
      label: "Headline",
      before: headlineBefore || "—",
      after: headlineAfter || "—",
    });
  }

  const subBefore = prev.subheadline?.trim() ?? "";
  const subAfter = next.subheadline?.trim() ?? "";
  if (
    subBefore !== subAfter &&
    (subBefore || subAfter) &&
    textSimilarity(subBefore, subAfter) < 0.85
  ) {
    changes.push({
      id: "subheadline",
      label: "Subheadline",
      before: subBefore || "—",
      after: subAfter || "—",
    });
  }

  const ctaBefore = prev.cta_text?.trim() ?? "";
  const ctaAfter = next.cta_text?.trim() ?? "";
  if (ctaBefore !== ctaAfter && (ctaBefore || ctaAfter)) {
    changes.push({
      id: "cta",
      label: "Button / CTA",
      before: ctaBefore || "—",
      after: ctaAfter || "—",
    });
  }

  const priceBefore = (prev.pricing_tiers ?? []).join(" · ");
  const priceAfter = (next.pricing_tiers ?? []).join(" · ");
  if (priceBefore !== priceAfter && (priceBefore || priceAfter)) {
    changes.push({
      id: "pricing",
      label: "Pricing",
      before: priceBefore || "—",
      after: priceAfter || "—",
    });
  }

  return changes;
}

export function formatSectionLabels(sections: string[] | undefined): string[] {
  if (!sections?.length) return [];
  return sections.map((s) => SECTION_LABELS[s] ?? s.replace(/_/g, " "));
}

export type ChangeStatusMeta = {
  kind: "permanent" | "ab_test" | "unknown";
  badge: string;
  badgeClass: string;
  hint: string;
  dotClass: string;
};

export type ChangeFilterKind = "all" | "permanent" | "ab_test" | "unknown";

export const CHANGE_FILTER_OPTIONS: Array<{
  id: ChangeFilterKind;
  label: string;
  activeClass: string;
}> = [
  {
    id: "all",
    label: "All",
    activeClass: "border-slate-300 bg-slate-900 text-white",
  },
  {
    id: "permanent",
    label: "Permanent",
    activeClass: "border-emerald-300 bg-emerald-600 text-white",
  },
  {
    id: "ab_test",
    label: "Possible A/B test",
    activeClass: "border-amber-300 bg-amber-500 text-white",
  },
  {
    id: "unknown",
    label: "Unclassified",
    activeClass: "border-slate-300 bg-slate-600 text-white",
  },
];

/** How we label confidence — matches classify-change.ts rules on the server. */
export function getChangeStatusMeta(analysis: ChangeAnalysis): ChangeStatusMeta {
  const confidence = analysis.change_confidence;

  if (confidence === "confirmed") {
    return {
      kind: "permanent",
      badge: "Permanent change",
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-900",
      hint: "Still live on a later capture — likely rolled out or a winning test variant.",
      dotClass: "bg-emerald-500",
    };
  }

  if (confidence === "suspected_ab") {
    return {
      kind: "ab_test",
      badge: "Possible A/B test",
      badgeClass: "border-amber-200 bg-amber-50 text-amber-900",
      hint: "Spotted once without a copy change — we confirm on the next screenshot if it sticks.",
      dotClass: "bg-amber-500",
    };
  }

  return {
    kind: "unknown",
    badge: "Change detected",
    badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
    hint: "Visual difference detected — status will update after the next capture.",
    dotClass: "bg-slate-400",
  };
}

export function getChangeKind(analysis: ChangeAnalysis): ChangeStatusMeta["kind"] {
  return getChangeStatusMeta(analysis).kind;
}

export function matchesChangeFilter(
  analysis: ChangeAnalysis,
  filter: ChangeFilterKind,
): boolean {
  if (filter === "all") return true;
  return getChangeKind(analysis) === filter;
}

export function summarizeWhatChanged(text: string | undefined, maxLen = 160): string {
  const t = text?.trim() ?? "";
  if (!t) return "";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trim()}…`;
}
