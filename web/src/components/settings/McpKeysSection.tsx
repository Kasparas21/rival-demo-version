"use client";

import { Check, Copy, KeyRound, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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

export function McpKeysSection() {
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

  const appOrigin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "https://spy-rival.com";

  return (
    <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1a1a2e] text-white">
          <KeyRound className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-[#111827]">MCP / AI assistants</h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Connect Claude, Cursor, or ChatGPT to query your competitor data read-only.{" "}
            <a href="/docs/mcp" className="text-[#2563EB] hover:underline">
              Setup guide
            </a>
          </p>
        </div>
      </div>

      {created ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/80 p-4">
          <p className="text-sm font-medium text-amber-900">Copy your API key now — it won&apos;t be shown again.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="flex-1 break-all rounded bg-white px-2 py-1.5 text-xs text-[#1f2937]">
              {created.plaintext}
            </code>
            <button
              type="button"
              onClick={() => void copyText(created.plaintext, "key")}
              className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-medium hover:bg-[#F9FAFB]"
            >
              {copied === "key" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              Copy key
            </button>
          </div>
          <p className="mt-3 text-xs font-medium text-[#374151]">Claude Code (one paste)</p>
          <pre className="mt-1 overflow-x-auto rounded bg-[#1a1a2e] p-3 text-[11px] text-emerald-100">
            {created.claude_mcp_add}
          </pre>
          <button
            type="button"
            onClick={() => void copyText(created.claude_mcp_add, "claude")}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline"
          >
            {copied === "claude" ? "Copied" : "Copy claude mcp add command"}
          </button>
          <p className="mt-3 text-xs font-medium text-[#374151]">Cursor (mcp.json snippet)</p>
          <pre className="mt-1 overflow-x-auto rounded bg-[#F3F4F6] p-3 text-[11px] text-[#1f2937]">
            {JSON.stringify(created.cursor_config_snippet, null, 2)}
          </pre>
          <button
            type="button"
            onClick={() =>
              void copyText(JSON.stringify(created.cursor_config_snippet, null, 2), "cursor")
            }
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline"
          >
            {copied === "cursor" ? "Copied" : "Copy Cursor snippet"}
          </button>
          <button
            type="button"
            className="mt-3 block text-xs text-[#6B7280] hover:underline"
            onClick={() => setCreated(null)}
          >
            Dismiss
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <label className="text-xs font-medium text-[#6B7280]">Label (optional)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="MacBook Claude"
              className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            disabled={creating}
            onClick={() => void createKey()}
            className="rounded-lg bg-[#1a1a2e] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d2d44] disabled:opacity-50"
          >
            {creating ? "Generating…" : "Generate API key"}
          </button>
        </div>
      )}

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">Active keys</p>
        {loading ? (
          <p className="mt-2 text-sm text-[#6B7280]">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="mt-2 text-sm text-[#6B7280]">No keys yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[#F3F4F6]">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-2 py-2.5">
                <div>
                  <p className="text-sm font-medium text-[#111827]">{k.label}</p>
                  <p className="text-xs text-[#6B7280]">
                    {k.masked} · created {new Date(k.created_at).toLocaleDateString()}
                    {k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void revoke(k.id)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">Connected AI apps (OAuth)</p>
        {loading ? (
          <p className="mt-2 text-sm text-[#6B7280]">Loading…</p>
        ) : connections.length === 0 ? (
          <p className="mt-2 text-sm text-[#6B7280]">No OAuth connections yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[#F3F4F6]">
            {connections.map((c) => (
              <li key={c.client_id} className="flex items-center justify-between gap-2 py-2.5">
                <div>
                  <p className="text-sm font-medium text-[#111827]">{c.client_name}</p>
                  <p className="text-xs text-[#6B7280]">
                    Connected {new Date(c.connected_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void revokeConnection(c.client_id)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-3 text-xs text-[#9CA3AF]">
        MCP URL: <code>{appOrigin}/api/mcp/mcp</code> (streamable HTTP — recommended for Claude.ai, ChatGPT, Claude
        Code, and Cursor)
      </p>
    </section>
  );
}
