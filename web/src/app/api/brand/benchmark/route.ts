import { NextResponse } from "next/server";

import {
  readBrandBenchmarkCache,
  writeBrandBenchmarkCache,
} from "@/lib/benchmark/benchmark-cache-store";
import {
  buildBrandBenchmarkPayload,
  computeBenchmarkCombinedFingerprint,
} from "@/lib/benchmark/build-brand-benchmark";
import type { BenchmarkPayload } from "@/lib/benchmark/benchmark-types";
import { billingRequiredResponseBody, getBillingEntitlement } from "@/lib/billing/entitlements";
import { applyDemoInsightsBenchmarkFilter } from "@/lib/debug/demo-insights-filter";
import { sanitizeJsonForPostgres } from "@/lib/json/sanitize-json-for-db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveWorkspaceContext } from "@/lib/team/workspace-context";

export const runtime = "nodejs";
export const maxDuration = 120;

/** GET — brand vs all competitors benchmark (cached by combined ads fingerprint). */
export async function GET(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(supabase, user.id);
  const dataUserId = ctx.dataUserId;

  const billing = await getBillingEntitlement(supabase, dataUserId);
  if (!billing.hasAccess) {
    return NextResponse.json(
      billingRequiredResponseBody("Start your subscription to view your brand benchmark."),
      { status: 402 },
    );
  }

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  const brandId = url.searchParams.get("brandId");

  try {
    const fingerprint = await computeBenchmarkCombinedFingerprint(supabase, dataUserId, brandId);
    if (!fingerprint) {
      return NextResponse.json({ ok: false, error: "Workspace brand not found" }, { status: 404 });
    }

    if (!force) {
      const cached = await readBrandBenchmarkCache(supabase, dataUserId);

      if (
        cached?.payload &&
        typeof cached.payload === "object" &&
        !Array.isArray(cached.payload) &&
        cached.combined_fingerprint === fingerprint
      ) {
        const p = cached.payload as BenchmarkPayload;
        if (p.ok === true && p.aiSummary) {
          console.log("[benchmark cache HIT]", { userId: user.id, fingerprint });
          return NextResponse.json(
            applyDemoInsightsBenchmarkFilter(
              {
                ...p,
                fromCache: true,
                computedAt: cached.computed_at ?? p.computedAt,
              },
              user.email,
            ),
          );
        }
      } else {
        console.log("[benchmark cache MISS]", { userId: user.id, fingerprint, hadRow: Boolean(cached) });
      }
    } else {
      console.log("[benchmark cache MISS]", { userId: user.id, reason: "force" });
    }

    const { payload, aiModel } = await buildBrandBenchmarkPayload({
      supabase,
      userId: dataUserId,
      brandId,
      skipLlm: false,
    });

    if (payload.competitors.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "Add competitors to your workspace to run a benchmark.",
      });
    }

    const admin = createSupabaseAdminClient();
    await writeBrandBenchmarkCache(admin, {
      userId: dataUserId,
      combinedFingerprint: payload.combinedFingerprint,
      payload: sanitizeJsonForPostgres({ ...payload, fromCache: false }) as BenchmarkPayload,
      aiModel,
      computedAt: payload.computedAt,
    });

    return NextResponse.json(applyDemoInsightsBenchmarkFilter(payload, user.email));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Benchmark failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
