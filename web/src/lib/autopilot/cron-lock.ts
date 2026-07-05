import { randomUUID } from "crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

const LOCK_TTL_MS = 6 * 60_000;

export type AutopilotCronJob = "autopilot-watch" | "autopilot-report";

export async function acquireAutopilotCronLock(
  admin: SupabaseClient<Database>,
  jobName: AutopilotCronJob,
): Promise<string | null> {
  const ownerToken = randomUUID();
  const now = Date.now();
  const lockedUntil = new Date(now + LOCK_TTL_MS).toISOString();

  const { data: existing } = await admin
    .from("autopilot_cron_locks")
    .select("job_name, locked_until, owner_token")
    .eq("job_name", jobName)
    .maybeSingle();

  if (existing?.locked_until) {
    const until = Date.parse(existing.locked_until);
    if (Number.isFinite(until) && until > now && existing.owner_token !== ownerToken) {
      return null;
    }
  }

  const { error } = await admin.from("autopilot_cron_locks").upsert(
    {
      job_name: jobName,
      locked_until: lockedUntil,
      owner_token: ownerToken,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "job_name" },
  );

  if (error) return null;

  const { data: check } = await admin
    .from("autopilot_cron_locks")
    .select("owner_token")
    .eq("job_name", jobName)
    .maybeSingle();

  if (check?.owner_token !== ownerToken) return null;
  return ownerToken;
}

export async function releaseAutopilotCronLock(
  admin: SupabaseClient<Database>,
  jobName: AutopilotCronJob,
  ownerToken: string,
): Promise<void> {
  await admin
    .from("autopilot_cron_locks")
    .update({
      locked_until: new Date().toISOString(),
      owner_token: ownerToken,
      updated_at: new Date().toISOString(),
    })
    .eq("job_name", jobName)
    .eq("owner_token", ownerToken);
}
