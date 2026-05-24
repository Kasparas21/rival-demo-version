import type { SupabaseClient } from "@supabase/supabase-js";

import type { BenchmarkPayload } from "@/lib/benchmark/benchmark-types";
import type { Json } from "@/lib/supabase/types";

type BenchmarkCacheRow = {
  payload: unknown;
  combined_fingerprint: string;
  ai_model: string | null;
  computed_at: string | null;
};

type UntypedDb = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: BenchmarkCacheRow | null; error: { message: string } | null }> };
    };
    upsert: (
      row: Record<string, unknown>,
      opts: { onConflict: string },
    ) => Promise<{ error: { message: string } | null }>;
  };
};

function asUntyped(client: SupabaseClient): UntypedDb {
  return client as unknown as UntypedDb;
}

export async function readBrandBenchmarkCache(
  client: SupabaseClient,
  userId: string,
): Promise<BenchmarkCacheRow | null> {
  const { data, error } = await asUntyped(client)
    .from("brand_benchmark_cache")
    .select("payload, combined_fingerprint, ai_model, computed_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[benchmark] cache read", error.message);
    return null;
  }
  return data;
}

export async function writeBrandBenchmarkCache(
  client: SupabaseClient,
  row: {
    userId: string;
    combinedFingerprint: string;
    payload: BenchmarkPayload;
    aiModel: string | null;
    computedAt: string;
  },
): Promise<void> {
  const { error } = await asUntyped(client).from("brand_benchmark_cache").upsert(
    {
      user_id: row.userId,
      combined_fingerprint: row.combinedFingerprint,
      payload: row.payload as unknown as Json,
      ai_model: row.aiModel,
      computed_at: row.computedAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.warn("[benchmark] cache write", error.message);
  }
}
