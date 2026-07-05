"use client";

import { Bot, Check, Copy, KeyRound, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { autopilotGlassCardClass } from "@/components/autopilot/autopilot-glass-ui";
import {
  SettingsFieldLabel,
  SettingsGlassButton,
  SettingsGlassSection,
  settingsGlassInputClass,
} from "@/components/settings/settings-glass-ui";
import { cn } from "@/lib/utils";
import { getPublicConnectorOrigin } from "@/lib/http/public-app-origin";

import { McpSetupGuideModal } from "./McpSetupGuideModal";

type McpKeyRow = {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
  masked: string;
};

type CreatedKey = {
  id: string;
  label: string;
  created_at: string;
  plaintext: string;
  claude_mcp_add: string;
  cursor_config_snippet: Record<string, unknown>;
};

type OAuthConnection = {
  client_id: string;
  client_name: string;
  connected_at: string;
};

function GlassCopyButton({
  label,
  copied,
  onClick,
  variant = "secondary",
}: {
  label: string;
  copied: boolean;
  onClick: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition active:scale-[0.98]",
        variant === "primary"
          ? "bg-[#1a1a2e] text-white shadow-[0_6px_20px_-8px_rgba(26,26,46,0.5)] hover:bg-[#2d2d44]"
          : "border border-white/70 bg-white/60 text-[#1a1a2e] shadow-sm backdrop-blur-sm hover:bg-white/85",
      )}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : label}
    </button>
  );
}

export function McpKeysSection() {
  const keysSectionRef = useRef<HTMLDivElement>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [keys, setKeys] = useState<McpKeyRow[]>([]);
  const [connections, setConnections] = useState<OAuthConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState<"key" | "claude" | "cursor" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [keysRes, connRes] = await Promise.all([
        fetch("/api/account/mcp-keys", { credentials: "include" }),
        fetch("/api/account/mcp-oauth-connections", { credentials: "include" }),
      ]);
      const keysJson = (await keysRes.json()) as { ok?: boolean; keys?: McpKeyRow[] };
      const connJson = (await connRes.json()) as { ok?: boolean; connections?: OAuthConnection[] };
      if (keysJson.ok && keysJson.keys) setKeys(keysJson.keys);
      if (connJson.ok && connJson.connections) setConnections(connJson.connections);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createKey = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/account/mcp-keys", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || undefined }),
      });
      const json = (await res.json()) as { ok?: boolean; key?: CreatedKey; error?: string };
      if (!res.ok || !json.ok || !json.key) {
        throw new Error(json.error ?? "Failed to create key");
      }
      setCreated(json.key);
      setLabel("");
      await load();
      toast.success("API key created — copy it now");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    if (!window.confirm("Revoke this API key? MCP clients using it will stop working.")) return;
    const res = await fetch(`/api/account/mcp-keys/${id}`, { method: "DELETE", credentials: "include" });
    const json = (await res.json()) as { ok?: boolean };
    if (!res.ok || !json.ok) {
      toast.error("Failed to revoke key");
      return;
    }
    await load();
    toast.success("Key revoked");
  };

  const revokeConnection = async (clientId: string) => {
    if (!window.confirm("Revoke this connected app? It will need to authorize again.")) return;
    const res = await fetch(`/api/account/mcp-oauth-connections/${encodeURIComponent(clientId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = (await res.json()) as { ok?: boolean };
    if (!res.ok || !json.ok) {
      toast.error("Failed to revoke connection");
      return;
    }
    await load();
    toast.success("Connection revoked");
  };

  const copyText = async (text: string, which: "key" | "claude" | "cursor") => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  const appOrigin = getPublicConnectorOrigin();

  return (
  <div ref={keysSectionRef}>
    <SettingsGlassSection
      icon={KeyRound}
      accent="indigo"
      title={
        <span className="inline-flex items-center gap-1.5">
          MCP / AI assistants
          <Sparkles className="h-4 w-4 text-indigo-500" aria-hidden />
        </span>
      }
      subtitle={
        <>
          Connect Claude, Cursor, or ChatGPT to query your competitor data read-only.
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-semibold text-[#4f46e5] transition hover:text-[#4338ca] hover:underline"
          >
            Setup guide
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </button>
        </>
      }
    >
      <div className={cn("rounded-2xl p-4", autopilotGlassCardClass)}>
        <div className="flex items-center gap-2 text-[12px] font-medium text-[#52525b]">
          <Bot className="h-4 w-4 text-[#6366f1]" aria-hidden />
          <span>
            Claude.ai / ChatGPT: add connector URL{" "}
            <code className="rounded-md bg-white/60 px-1.5 py-0.5 text-[11px]">{appOrigin}/api/mcp/mcp</code> — OAuth,
            no API key
          </span>
        </div>
      </div>

      {created ? (
        <div
          className={cn(
            "mt-4 space-y-4 rounded-2xl border border-amber-200/70 bg-amber-50/50 p-4 backdrop-blur-xl sm:p-5",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
          )}
        >
          <p className="text-[14px] font-semibold text-amber-950">
            Copy your API key now — it won&apos;t be shown again.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <code className="flex-1 break-all rounded-xl border border-white/70 bg-white/80 px-3 py-3 text-[12px] text-[#1f2937]">
              {created.plaintext}
            </code>
            <GlassCopyButton
              label="Copy key"
              copied={copied === "key"}
              onClick={() => void copyText(created.plaintext, "key")}
              variant="primary"
            />
          </div>

          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6b7280]">Claude Code</p>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-[#1a1a2e] p-3.5 text-[11px] leading-relaxed text-emerald-100">
              {created.claude_mcp_add}
            </pre>
            <div className="mt-2">
              <GlassCopyButton
                label="Copy command"
                copied={copied === "claude"}
                onClick={() => void copyText(created.claude_mcp_add, "claude")}
              />
            </div>
          </div>

          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6b7280]">Cursor</p>
            <pre className="mt-2 overflow-x-auto rounded-xl border border-white/60 bg-white/70 p-3.5 text-[11px] text-[#1f2937]">
              {JSON.stringify(created.cursor_config_snippet, null, 2)}
            </pre>
            <div className="mt-2">
              <GlassCopyButton
                label="Copy snippet"
                copied={copied === "cursor"}
                onClick={() => void copyText(JSON.stringify(created.cursor_config_snippet, null, 2), "cursor")}
              />
            </div>
          </div>

          <button
            type="button"
            className="min-h-[44px] text-[13px] font-medium text-[#71717a] underline-offset-2 hover:text-[#1a1a2e] hover:underline"
            onClick={() => setCreated(null)}
          >
            Dismiss
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <SettingsFieldLabel>Label (optional)</SettingsFieldLabel>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="MacBook Claude"
              className={cn(settingsGlassInputClass, "mt-1.5")}
            />
          </div>
          <SettingsGlassButton disabled={creating} onClick={() => void createKey()} className="shrink-0">
            {creating ? "Generating…" : "Generate API key"}
          </SettingsGlassButton>
        </div>
      )}

      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#a1a1aa]">Active keys</p>
        {loading ? (
          <p className="mt-3 text-[13px] text-[#71717a]">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="mt-3 text-[13px] text-[#71717a]">No keys yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {keys.map((k) => (
              <li
                key={k.id}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between",
                  autopilotGlassCardClass,
                )}
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[#1a1a2e]">{k.label}</p>
                  <p className="mt-0.5 text-[12px] text-[#71717a]">
                    {k.masked} · created {new Date(k.created_at).toLocaleDateString()}
                    {k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <SettingsGlassButton variant="danger" onClick={() => void revoke(k.id)}>
                  <Trash2 className="h-4 w-4" />
                  Revoke
                </SettingsGlassButton>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#a1a1aa]">Connected AI apps (OAuth)</p>
        {loading ? (
          <p className="mt-3 text-[13px] text-[#71717a]">Loading…</p>
        ) : connections.length === 0 ? (
          <p className="mt-3 text-[13px] text-[#71717a]">No OAuth connections yet — connect via Claude.ai settings.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {connections.map((c) => (
              <li
                key={c.client_id}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between",
                  autopilotGlassCardClass,
                )}
              >
                <div>
                  <p className="text-[14px] font-semibold text-[#1a1a2e]">{c.client_name}</p>
                  <p className="mt-0.5 text-[12px] text-[#71717a]">
                    Connected {new Date(c.connected_at).toLocaleDateString()}
                  </p>
                </div>
                <SettingsGlassButton variant="danger" onClick={() => void revokeConnection(c.client_id)}>
                  <Trash2 className="h-4 w-4" />
                  Revoke
                </SettingsGlassButton>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SettingsGlassSection>

    <McpSetupGuideModal
      open={guideOpen}
      onClose={() => setGuideOpen(false)}
      hasApiKey={keys.length > 0 || created !== null}
      claudeCommand={created?.claude_mcp_add}
      cursorSnippet={created?.cursor_config_snippet}
      onScrollToKeys={() => {
        keysSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }}
    />
  </div>
  );
}
