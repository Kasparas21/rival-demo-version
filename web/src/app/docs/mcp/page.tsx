import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MCP setup — Spy-Rival",
  description:
    "Connect Claude, Cursor, or ChatGPT to your Spy-Rival competitor intelligence with read-only MCP tools.",
};

const MCP_URL = "https://spy-rival.com/api/mcp/mcp";

export default function McpDocsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-sm text-[#6B7280]">
        <Link href="/" className="hover:underline">
          Spy-Rival
        </Link>{" "}
        / docs / mcp
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#111827]">MCP for AI assistants</h1>
      <p className="mt-3 text-base leading-relaxed text-[#4B5563]">
        Ask Claude, ChatGPT, or Cursor questions about your tracked competitors — ads, angles, alerts, and strategy
        overviews — without leaving the chat.
      </p>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-[#111827]">A. Claude.ai and ChatGPT (OAuth)</h2>
        <p className="text-sm leading-relaxed text-[#4B5563]">
          Add a custom connector with this URL — OAuth is automatic, no API key needed:
        </p>
        <code className="block rounded-lg bg-[#F3F4F6] px-3 py-2 text-sm text-[#1f2937]">{MCP_URL}</code>
        <ul className="list-inside list-disc space-y-2 text-sm text-[#374151]">
          <li>
            <strong>Claude.ai:</strong> Settings → Connectors → Add custom connector → paste the URL above → sign in and
            approve read-only access on the consent screen.
          </li>
          <li>
            <strong>ChatGPT:</strong> Settings → Connectors → Developer mode → create connector with the same URL →
            complete the OAuth consent flow when prompted.
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-[#111827]">B. Claude Code and Cursor (API key)</h2>
        <p className="text-sm leading-relaxed text-[#4B5563]">
          Log in →{" "}
          <Link href="/dashboard/settings" className="text-[#2563EB] hover:underline">
            Settings
          </Link>{" "}
          → <strong>MCP / AI assistants</strong> → Generate API key. Copy it immediately — we only show it once.
        </p>
        <p className="text-sm font-medium text-[#374151]">Claude Code</p>
        <pre className="overflow-x-auto rounded-lg bg-[#1a1a2e] p-4 text-sm text-emerald-100">
          {`claude mcp add rival --transport http ${MCP_URL} --header "Authorization: Bearer YOUR_KEY"`}
        </pre>
        <p className="text-sm font-medium text-[#374151]">Cursor</p>
        <p className="text-sm text-[#4B5563]">Add to Settings → MCP (mcp.json):</p>
        <pre className="overflow-x-auto rounded-lg bg-[#F3F4F6] p-4 text-xs text-[#1f2937]">
          {JSON.stringify(
            {
              mcpServers: {
                rival: {
                  url: MCP_URL,
                  headers: { Authorization: "Bearer YOUR_KEY" },
                },
              },
            },
            null,
            2,
          )}
        </pre>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-[#111827]">What can I ask?</h2>
        <ul className="space-y-3 text-sm leading-relaxed text-[#374151]">
          <li>What are my competitors&apos; longest-running ads on Meta?</li>
          <li>What angles is Acme Corp using that I&apos;m not?</li>
          <li>Any competitor moves in the last 7 days?</li>
          <li>Show organic posts and insights for adidas.com.</li>
          <li>What deals and cadence show up in their captured emails?</li>
          <li>Which landing pages get the most bottom-funnel ad traffic?</li>
          <li>What is their strategy map journey end goal — paths, deals, and creatives?</li>
          <li>Search my copy vault for &quot;free trial&quot; messaging.</li>
          <li>Search discovery ads for &quot;implant&quot; or &quot;free consultation&quot; across all tracked competitors.</li>
          <li>What are the top keywords in my discovery feed this week?</li>
          <li>Show the weekly discovery patterns report for my client workspace.</li>
          <li>Which competitor launched the most video ads in the last 30 days?</li>
          <li>How many competitors am I tracking on my plan?</li>
          <li>Show the strategy overview for northwindhealth.com if it&apos;s cached.</li>
        </ul>
      </section>

      <p className="mt-10 text-sm leading-relaxed text-[#6B7280]">
        read-only and private — Spy-Rival only ever reads your own competitor data. Nothing in MCP can change your
        account, trigger scrapes, or access another user&apos;s data.
      </p>

      <p className="mt-6 text-xs text-[#9CA3AF]">Rate limit: 60 calls/min and 1000/day per API key or OAuth connection.</p>
    </main>
  );
}
