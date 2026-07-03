import { z } from "zod";

export type OrganicPostScores = {
  entertainment: number;
  authenticity: number;
  relatability: number;
  aspiration: number;
  education: number;
  community: number;
};

export type OrganicPostPreviewAnalysis = {
  content_style: { label: string; description: string };
  hook_analysis: string;
  engagement_drivers: string[];
  audience_signals: string[];
  format_notes: string;
  brand_voice: string;
  why_it_works: string[];
  risk_flags: string[];
  replication_playbook: string[];
  organic_scores: OrganicPostScores;
  confidence: "high" | "medium" | "low";
};

export const ORGANIC_SCORE_LABELS: { key: keyof OrganicPostScores; label: string }[] = [
  { key: "entertainment", label: "Entertainment" },
  { key: "authenticity", label: "Authenticity" },
  { key: "relatability", label: "Relatability" },
  { key: "aspiration", label: "Aspiration" },
  { key: "education", label: "Education" },
  { key: "community", label: "Community" },
];

const score = z.number().min(0).max(100);

export const organicPostPreviewAnalysisSchema: z.ZodType<OrganicPostPreviewAnalysis> = z.object({
  content_style: z.object({
    label: z.string(),
    description: z.string(),
  }),
  hook_analysis: z.string(),
  engagement_drivers: z.array(z.string()).min(1).max(5),
  audience_signals: z.array(z.string()).min(1).max(5),
  format_notes: z.string(),
  brand_voice: z.string(),
  why_it_works: z.array(z.string()).min(1).max(5),
  risk_flags: z.array(z.string()).max(3),
  replication_playbook: z.array(z.string()).min(3).max(5),
  organic_scores: z.object({
    entertainment: score,
    authenticity: score,
    relatability: score,
    aspiration: score,
    education: score,
    community: score,
  }),
  confidence: z.enum(["high", "medium", "low"]),
});

export type OrganicPostAnalysisQuota = {
  used: number;
  limit: number | null;
  remaining: number | null;
};
