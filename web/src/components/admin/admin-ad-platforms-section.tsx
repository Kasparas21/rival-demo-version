"use client";

import { useState } from "react";

import { CHANNELS } from "@/components/channel-picker-modal";
import { DEFAULT_ENABLED_AD_PLATFORMS } from "@/lib/ad-library/disabled-scrape-platforms";

/** Admin user page: which ad platforms this account may scrape. Off platforms show as "Coming soon" to the user. */
export function AdminAdPlatformsSection({
  userId,
  enabled,
}: {
  userId: string;
  enabled: readonly string[] | undefined;
}) {
  const initialKey = [...(enabled ?? DEFAULT_ENABLED_AD_PLATFORMS)].sort().join(",");
  /** Last saved list, tracked here so a save doesn't need the whole page to reload. */
  const [savedKey, setSavedKey] = useState(initialKey);
  const [picked, setPicked] = useState<string[]>(initialKey ? initialKey.split(",") : []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /** The page refetched with a different saved list: start from it (reset during render, not in an effect). */
  const [syncedKey, setSyncedKey] = useState(initialKey);
  if (syncedKey !== initialKey) {
    setSyncedKey(initialKey);
    setSavedKey(initialKey);
    setPicked(initialKey ? initialKey.split(",") : []);
  }

  const dirty = [...picked].sort().join(",") !== savedKey;

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledAdPlatforms: CHANNELS.map((c) => c.id).filter((id) => picked.includes(id)) }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? `Update failed (${res.status})`);
        return;
      }
      setSavedKey([...picked].sort().join(","));
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
      <h2 className="text-sm font-semibold text-zinc-900">Ad platforms</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Platforms this user can scrape and pick. Everything else shows as &quot;Coming soon&quot;. New accounts start with
        Meta and Google.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {CHANNELS.map(({ id, name, Logo }) => {
          const on = picked.includes(id);
          return (
            <label
              key={id}
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                on ? "border-zinc-900 bg-white text-zinc-900" : "border-zinc-300 bg-white/60 text-zinc-500"
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => {
                  setSuccess(false);
                  setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
                }}
                className="size-4"
              />
              <Logo className="h-4 w-4" />
              {name.replace(" ads", "")}
            </label>
          );
        })}
      </div>
      <div className="mt-4">
        <button
          type="button"
          disabled={saving || !dirty}
          onClick={() => void save()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="mt-2 text-sm text-emerald-700">Ad platforms updated.</p> : null}
    </section>
  );
}
