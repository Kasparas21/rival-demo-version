import type { AgentChannelsConfig } from "@/lib/agent/types";

export type AgentSettingsState = {
  enabled: boolean;
  channels: AgentChannelsConfig;
  min_threat_score: number;
  weekly_brief_enabled: boolean;
  weekly_brief_day: string;
  weekly_brief_time: string;
  user_email: string | null;
};

export type AgentMessageRow = {
  id: string;
  competitor_name: string;
  subject: string | null;
  channels: string[];
  sent_at: string;
  status: string;
};

export const AGENT_THRESHOLD_OPTIONS = [
  { value: 6, label: "Important or higher (score 6+)" },
  { value: 8, label: "High priority only (score 8+)" },
  { value: 10, label: "Critical only (score 10)" },
] as const;
