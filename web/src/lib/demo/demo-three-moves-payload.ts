import type { BrandComparisonLlmResult } from "@/lib/brand-comparison/run-brand-comparison-llm";

export function buildDemoThreeMovesComparison(
  workspaceName: string,
  competitorName: string,
): BrandComparisonLlmResult {
  return {
    headlineTitles: {
      userArchetype: "BRAND-CONSCIOUS SHOPPERS ON GOOGLE",
      competitorArchetype: "TIKTOK-FIRST BRAND AWARENESS",
    },
    moves: [
      {
        category: "COPY_ANGLE",
        title: `Steal ${competitorName}'s TikTok Video Angle`,
        evidence: `${competitorName} deploys 30 ads using the "Brand mention only · Hook: ${competitorName} · Body: Brand awareness video" angle on TikTok, with 20% of their total ads being video (vs. ${workspaceName}'s 3% video share). That cluster has been live for three weeks with no fatigue signals in the latest scrape. Replicating the hook structure on your TikTok account closes the awareness gap without copying verbatim copy.`,
        primaryAction: {
          label: "Create brief: brand awareness video for TikTok",
          type: "create_brief",
          angleRef: "Brand awareness video",
        },
      },
      {
        category: "SHIFT_BUDGET",
        title: "Move 5% of Google Spend to TikTok",
        evidence: `${workspaceName} allocates 62% of modeled spend (est. €98,400) to Google, where avg ad lifespan is 142 days, but ${competitorName} achieves 31% of spend on TikTok with 81 ads and avg lifespan of only 21 days—indicating high-velocity testing. Shifting even 5% of Google budget to TikTok mirrors their test cadence while preserving search capture. Their fastest-refreshing TikTok hooks skew TOFU video—start there before scaling spend.`,
        primaryAction: {
          label: "View budget analysis for TikTok vs Google",
          type: "view_analysis",
        },
      },
      {
        category: "EXPAND",
        title: "Launch on Snapchat for Younger Audience",
        evidence: `${competitorName} runs 29 ads on Snapchat (4% of modeled spend, est. €2,316) with avg lifespan under 18 days—suggesting aggressive creative rotation on a youth-skewing platform. ${workspaceName} has no Snapchat footprint in the latest scrape. Their top-performing Snapchat angle uses short-form product demos with minimal brand copy.`,
        primaryAction: {
          label: `View ${competitorName} Snapchat ads for inspiration`,
          type: "view_ads",
          angleRef: "Snapchat product demo",
        },
      },
    ],
  };
}
