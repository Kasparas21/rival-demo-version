/**
 * Ad platform ids, safe to import from server code. The picker's labels and logos live in
 * `components/channel-picker-modal.tsx`, a "use client" module: its runtime values are only references
 * on the server, so server code must take ids and defaults from here.
 */
export const CHANNEL_IDS = ["meta", "google", "tiktok", "linkedin", "pinterest", "snapchat"] as const;

export type ChannelId = (typeof CHANNEL_IDS)[number];

/** Default when opening the picker — exported for ads-library defaults */
export const DEFAULT_SELECTED_CHANNELS: ChannelId[] = ["meta", "google"];

export function isChannelId(value: unknown): value is ChannelId {
  return typeof value === "string" && (CHANNEL_IDS as readonly string[]).includes(value);
}
