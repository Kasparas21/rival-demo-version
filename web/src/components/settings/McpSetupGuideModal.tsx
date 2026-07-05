"use client";

import {
  Bot,
  Check,
  ChevronRight,
  Copy,
  KeyRound,
  MessageSquare,
  Shield,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import { autopilotGlassCardClass } from "@/components/autopilot/autopilot-glass-ui";
import { glassModalShellClass } from "@/components/ui/glass-styles";
import { getPublicConnectorOrigin, publicMcpEndpointUrl } from "@/lib/http/public-app-origin";
import { cn } from "@/lib/utils";

type Platform = "claude-ai" | "chatgpt" | "claude-code" | "cursor";

type McpSetupGuideModalProps = {
  open: boolean;
  onClose: () => void;
  hasApiKey?: boolean;
  onScrollToKeys?: () => void;
  claudeCommand?: string;
  cursorSnippet?: Record<string, unknown>;
};

const PLATFORMS: { id: Platform; label: string; emoji: string; needsKey: boolean }[] = [
  { id: "claude-ai", label: "Claude.ai", emoji: "✦", needsKey: false },
  { id: "chatgpt", label: "ChatGPT", emoji: "◎", needsKey: false },
  { id: "claude-code", label: "Claude Code", emoji: "⌘", needsKey: true },
  { id: "cursor", label: "Cursor", emoji: "▣", needsKey: true },
];

const EXAMPLE_PROMPTS = [
  "What are my competitors' longest-running Meta ads?",
  "What angles is Acme using that I'm not?",
  "Any competitor moves in the last 7 days?",
  "Search my copy vault for \"free trial\" messaging.",
];

function CopyChip({
  label,
  value,
  variant = "light",
}: {
  label: string;
  value: string;
  variant?: "light" | "dark";
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#71717a]">{label}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <code
          className={cn(
            "flex-1 break-all rounded-xl px-3 py-2.5 text-[11px] leading-relaxed",
            variant === "dark"
              ? "bg-[#1a1a2e] text-emerald-100"
              : "border border-white/70 bg-white/75 text-[#1f2937]",
          )}
        >
          {value}
        </code>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/70 bg-white/60 px-4 py-2 text-[12px] font-semibold text-[#1a1a2e] shadow-sm backdrop-blur-sm transition hover:bg-white/85 active:scale-[0.98]"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function StepCard({
  step,
  title,
  children,
  isLast,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <li className="relative flex gap-3.5">
      {!isLast ? (
        <span
          className="absolute left-[17px] top-10 bottom-0 w-px bg-gradient-to-b from-indigo-300/60 to-transparent"
          aria-hidden
        />
      ) : null}
      <span className="relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1a1a2e] to-indigo-800 text-[13px] font-bold text-white shadow-[0_4px_14px_-4px_rgba(26,26,46,0.55)] ring-2 ring-white/80">
        {step}
      </span>
      <div className={cn("min-w-0 flex-1 pb-5", autopilotGlassCardClass, "px-3.5 py-3")}>
        <p className="text-[14px] font-semibold text-[#1a1a2e]">{title}</p>
        <div className="mt-2 text-[13px] leading-relaxed text-[#52525b]">{children}</div>
      </div>
    </li>
  );
}

function OAuthSteps({ mcpUrl, platform }: { mcpUrl: string; platform: "claude-ai" | "chatgpt" }) {
  const isClaude = platform === "claude-ai";
  return (
    <ol className="mt-4 space-y-0">
      <StepCard step={1} title={isClaude ? "Open Claude settings" : "Open ChatGPT settings"}>
        {isClaude ? (
          <>
            In <strong>claude.ai</strong>, click your profile → <strong>Settings</strong> →{" "}
            <strong>Connectors</strong>.
          </>
        ) : (
          <>
            In ChatGPT, go to <strong>Settings</strong> → <strong>Connectors</strong> and enable{" "}
            <strong>Developer mode</strong> if prompted.
          </>
        )}
      </StepCard>
      <StepCard step={2} title="Add a custom connector">
        Choose <strong>Add custom connector</strong> (or &quot;Create connector&quot;). Leave OAuth client ID and
        secret <strong>blank</strong> — Rival registers automatically.
      </StepCard>
      <StepCard step={3} title="Paste the Rival MCP URL">
        <CopyChip label="Connector URL" value={mcpUrl} />
      </StepCard>
      <StepCard step={4} title="Sign in & approve" isLast>
        You&apos;ll be redirected to Rival to sign in. Approve <strong>read-only</strong> access — no API key needed.
        Then ask questions about your competitors right in chat.
      </StepCard>
    </ol>
  );
}

function ClaudeCodeSteps({
  mcpUrl,
  command,
  hasApiKey,
  onScrollToKeys,
}: {
  mcpUrl: string;
  command: string;
  hasApiKey: boolean;
  onScrollToKeys?: () => void;
}) {
  return (
    <ol className="mt-4 space-y-0">
      <StepCard step={1} title="Generate an API key">
        {hasApiKey ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-700">
            <Check className="h-4 w-4" /> You already have a key — use it in the command below.
          </span>
        ) : (
          <>
            Scroll down in this settings section and tap <strong>Generate API key</strong>. Copy it immediately — we only
            show it once.
            {onScrollToKeys ? (
              <button
                type="button"
                onClick={onScrollToKeys}
                className="mt-2 inline-flex min-h-[40px] items-center gap-1 text-[13px] font-semibold text-[#4f46e5] hover:underline"
              >
                Go to API keys
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : null}
          </>
        )}
      </StepCard>
      <StepCard step={2} title="Run one command in your terminal">
        <CopyChip label="Claude Code" value={command} variant="dark" />
        <p className="mt-2 text-[12px] text-[#71717a]">
          Replace <code className="rounded bg-white/60 px-1">YOUR_KEY</code> if you haven&apos;t generated a key yet.
          Server URL: <code className="rounded bg-white/60 px-1 text-[11px]">{mcpUrl}</code>
        </p>
      </StepCard>
      <StepCard step={3} title="Start asking Rival" isLast>
        Open Claude Code and try: <em>&quot;What competitors am I tracking?&quot;</em> or any prompt from the examples
        below.
      </StepCard>
    </ol>
  );
}

function CursorSteps({
  snippet,
  hasApiKey,
  onScrollToKeys,
}: {
  snippet: string;
  hasApiKey: boolean;
  onScrollToKeys?: () => void;
}) {
  return (
    <ol className="mt-4 space-y-0">
      <StepCard step={1} title="Generate an API key">
        {hasApiKey ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-700">
            <Check className="h-4 w-4" /> You already have a key — it&apos;s embedded in the snippet below if you just
            generated one.
          </span>
        ) : (
          <>
            Tap <strong>Generate API key</strong> in this settings section first.
            {onScrollToKeys ? (
              <button
                type="button"
                onClick={onScrollToKeys}
                className="mt-2 inline-flex min-h-[40px] items-center gap-1 text-[13px] font-semibold text-[#4f46e5] hover:underline"
              >
                Go to API keys
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : null}
          </>
        )}
      </StepCard>
      <StepCard step={2} title="Open Cursor MCP settings">
        In Cursor: <strong>Settings</strong> → <strong>MCP</strong> → edit <code className="rounded bg-white/60 px-1">mcp.json</code>{" "}
        (or use the MCP UI to add a server).
      </StepCard>
      <StepCard step={3} title="Paste this config" isLast>
        <CopyChip label="mcp.json snippet" value={snippet} />
        <p className="mt-2 text-[12px] text-[#71717a]">
          Restart Cursor if needed, then Rival tools appear in the agent.
        </p>
      </StepCard>
    </ol>
  );
}

export function McpSetupGuideModal({
  open,
  onClose,
  hasApiKey = false,
  onScrollToKeys,
  claudeCommand,
  cursorSnippet,
}: McpSetupGuideModalProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [platform, setPlatform] = useState<Platform>("claude-ai");

  const appOrigin = getPublicConnectorOrigin();
  const mcpUrl = publicMcpEndpointUrl();
  const defaultClaudeCmd = `claude mcp add rival --transport http ${mcpUrl} --header "Authorization: Bearer YOUR_KEY"`;
  const defaultCursorSnippet = JSON.stringify(
    {
      mcpServers: {
        rival: {
          url: mcpUrl,
          headers: { Authorization: "Bearer YOUR_KEY" },
        },
      },
    },
    null,
    2,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) setPlatform("claude-ai");
  }, [open]);

  if (!mounted || !open) return null;

  const active = PLATFORMS.find((p) => p.id === platform)!;

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e]/55 via-indigo-950/35 to-violet-950/25 backdrop-blur-md motion-reduce:backdrop-blur-none"
        aria-label="Close setup guide"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-[520px] flex-col overflow-hidden",
          glassModalShellClass,
          "shadow-[0_32px_80px_-20px_rgba(15,23,42,0.45)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300",
        )}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-400/25 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-violet-400/15 blur-3xl" aria-hidden />

        <div className="relative flex items-start justify-between gap-3 border-b border-white/50 bg-white/30 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-indigo-900 text-white shadow-[0_8px_24px_-8px_rgba(26,26,46,0.6)] ring-1 ring-white/20">
              <KeyRound className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 id={titleId} className="text-[17px] font-semibold tracking-tight text-[#1a1a2e]">
                  Connect Rival to AI
                </h2>
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" aria-hidden />
              </div>
              <p className="mt-0.5 text-[12px] leading-snug text-[#71717a]">
                Step-by-step — read-only access to your competitor data
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/60 bg-white/50 p-2 text-[#71717a] shadow-sm backdrop-blur-sm transition hover:bg-white/80 hover:text-[#1a1a2e]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatform(p.id)}
                className={cn(
                  "inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold transition active:scale-[0.98]",
                  platform === p.id
                    ? "bg-[#1a1a2e] text-white shadow-[0_4px_16px_-6px_rgba(26,26,46,0.5)]"
                    : "border border-white/70 bg-white/55 text-[#52525b] backdrop-blur-sm hover:bg-white/75",
                )}
              >
                <span aria-hidden>{p.emoji}</span>
                {p.label}
                {p.needsKey ? (
                  <KeyRound className="h-3 w-3 opacity-60" aria-hidden />
                ) : (
                  <Shield className="h-3 w-3 text-emerald-500" aria-hidden />
                )}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50/45 px-3 py-2 text-[11px] text-emerald-900 backdrop-blur-sm">
            <Shield className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            {active.needsKey ? (
              <span>
                Uses an API key you generate below — <strong>read-only</strong>, never shared with other users.
              </span>
            ) : (
              <span>
                <strong>OAuth</strong> — no API key. Sign in once and approve read-only access.
              </span>
            )}
          </div>

          {platform === "claude-ai" ? <OAuthSteps mcpUrl={mcpUrl} platform="claude-ai" /> : null}
          {platform === "chatgpt" ? <OAuthSteps mcpUrl={mcpUrl} platform="chatgpt" /> : null}
          {platform === "claude-code" ? (
            <ClaudeCodeSteps
              mcpUrl={mcpUrl}
              command={claudeCommand ?? defaultClaudeCmd}
              hasApiKey={hasApiKey}
              onScrollToKeys={() => {
                onClose();
                onScrollToKeys?.();
              }}
            />
          ) : null}
          {platform === "cursor" ? (
            <CursorSteps
              snippet={
                cursorSnippet
                  ? JSON.stringify(cursorSnippet, null, 2)
                  : defaultCursorSnippet
              }
              hasApiKey={hasApiKey}
              onScrollToKeys={() => {
                onClose();
                onScrollToKeys?.();
              }}
            />
          ) : null}

          <div className={cn("mt-2 p-3.5", autopilotGlassCardClass)}>
            <div className="flex items-center gap-2 text-[12px] font-semibold text-[#1a1a2e]">
              <MessageSquare className="h-4 w-4 text-indigo-500" aria-hidden />
              Try asking
            </div>
            <ul className="mt-2 space-y-1.5">
              {EXAMPLE_PROMPTS.map((q) => (
                <li key={q} className="flex items-start gap-2 text-[12px] leading-snug text-[#52525b]">
                  <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a1a1aa]" aria-hidden />
                  {q}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/40 px-3 py-2 text-[11px] text-[#71717a]">
            <Terminal className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Rate limit: 60 calls/min · 1000/day per key or OAuth connection
          </div>
        </div>

        <div className="relative border-t border-white/50 bg-white/25 px-5 py-3.5 backdrop-blur-xl">
          <button
            type="button"
            onClick={onClose}
            className="flex w-full min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-b from-[#1a1a2e] to-[#2d2d44] text-[14px] font-semibold text-white shadow-[0_6px_20px_-8px_rgba(26,26,46,0.5)] transition hover:shadow-[0_8px_24px_-8px_rgba(26,26,46,0.55)] active:scale-[0.99]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
