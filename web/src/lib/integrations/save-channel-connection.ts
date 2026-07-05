import type { SupabaseClient } from "@supabase/supabase-js";

import type { SlackConnection, WatchChannels } from "@/lib/autopilot/types";
import { ensureAutopilotSettings } from "@/lib/autopilot/settings-db";
import type { Database } from "@/lib/supabase/types";

function parseWatchChannels(raw: unknown): WatchChannels {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { email: true, slack: false, discord: false };
  }
  const o = raw as Record<string, unknown>;
  return {
    email: o.email !== false,
    slack: o.slack === true,
    discord: false,
  };
}

async function loadWatchChannels(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<WatchChannels> {
  const { data } = await supabase
    .from("autopilot_settings")
    .select("watch_channels")
    .eq("user_id", userId)
    .maybeSingle();
  return parseWatchChannels(data?.watch_channels);
}

export async function saveSlackConnection(
  supabase: SupabaseClient<Database>,
  userId: string,
  params: { webhookUrl: string; connection: SlackConnection },
): Promise<void> {
  await ensureAutopilotSettings(supabase, userId);
  const channels = await loadWatchChannels(supabase, userId);

  const { error } = await supabase
    .from("autopilot_settings")
    .update({
      slack_webhook_url: params.webhookUrl,
      slack_connection: params.connection,
      watch_channels: { ...channels, slack: true },
    })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function disconnectSlack(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const channels = await loadWatchChannels(supabase, userId);

  const { error } = await supabase
    .from("autopilot_settings")
    .update({
      slack_webhook_url: null,
      slack_connection: null,
      watch_channels: { ...channels, slack: false },
    })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}
