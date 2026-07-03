import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AGENT_DAILY_MESSAGE_LIMIT,
  AGENT_DUPLICATE_WINDOW_MS,
  DEFAULT_AGENT_CHANNELS,
  type AgentChannelsConfig,
} from "@/lib/agent/types";
import type { Database, Json } from "@/lib/supabase/types";

export type AgentSettingsRow = Database["public"]["Tables"]["agent_settings"]["Row"];

export function parseAgentChannels(raw: Json | null | undefined): AgentChannelsConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_AGENT_CHANNELS };
  return { ...DEFAULT_AGENT_CHANNELS, ...(raw as AgentChannelsConfig) };
}

export function defaultAgentSettingsInsert(userId: string): Database["public"]["Tables"]["agent_settings"]["Insert"] {
  return {
    user_id: userId,
    enabled: true,
    channels: DEFAULT_AGENT_CHANNELS as unknown as Json,
    min_threat_score: 6,
    weekly_brief_enabled: false,
    weekly_brief_day: "monday",
    weekly_brief_time: "08:00",
  };
}

export async function getOrCreateAgentSettings(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<AgentSettingsRow> {
  const { data: existing, error: selectError } = await supabase
    .from("agent_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (existing) return existing;

  const insert = defaultAgentSettingsInsert(userId);
  const { data: created, error } = await supabase.from("agent_settings").insert(insert).select("*").single();

  if (error || !created) {
    throw new Error(error?.message ?? "Failed to create agent settings");
  }

  return created;
}

export async function hasRecentAgentMessage(
  admin: SupabaseClient<Database>,
  userId: string,
  competitorId: string | null,
): Promise<boolean> {
  const since = new Date(Date.now() - AGENT_DUPLICATE_WINDOW_MS).toISOString();

  let query = admin
    .from("agent_messages")
    .select("id")
    .eq("user_id", userId)
    .gte("sent_at", since)
    .limit(1);

  if (competitorId) {
    query = query.eq("competitor_id", competitorId);
  } else {
    query = query.is("competitor_id", null);
  }

  const { data } = await query;
  return (data?.length ?? 0) > 0;
}

export async function countAgentMessagesToday(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { count } = await admin
    .from("agent_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("sent_at", startOfDay.toISOString());

  return count ?? 0;
}

export async function isAgentDailyLimitReached(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const count = await countAgentMessagesToday(admin, userId);
  return count >= AGENT_DAILY_MESSAGE_LIMIT;
}

export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}
