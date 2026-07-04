"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ConsentForm() {
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);

  const clientId = searchParams.get("client_id") ?? "";
  const redirectUri = searchParams.get("redirect_uri") ?? "";
  const codeChallenge = searchParams.get("code_challenge") ?? "";
  const codeChallengeMethod = searchParams.get("code_challenge_method") ?? "";
  const scope = searchParams.get("scope") ?? "mcp:read";
  const state = searchParams.get("state") ?? "";

  if (!clientId || !redirectUri || !codeChallenge) {
    return (
      <p className="text-sm text-red-600">Invalid OAuth request — missing parameters.</p>
    );
  }

  const submit = (decision: "allow" | "deny") => {
    setSubmitting(true);
    const form = document.getElementById("oauth-consent-form") as HTMLFormElement;
    const decisionInput = document.getElementById("oauth-decision") as HTMLInputElement;
    decisionInput.value = decision;
    form.submit();
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-[#111827]">Connect AI assistant</h1>
      <p className="mt-2 text-sm leading-relaxed text-[#4B5563]">
        This app wants <strong>read-only</strong> access to your Rival competitor data — tracked competitors, ads,
        alerts, and cached strategy overviews. It cannot change your account or trigger scrapes.
      </p>
      <p className="mt-3 text-xs text-[#6B7280]">
        Client: <code className="break-all">{clientId}</code>
      </p>
      <p className="mt-1 text-xs text-[#6B7280]">Scope: {scope}</p>

      <form
        id="oauth-consent-form"
        method="POST"
        action="/api/oauth/consent"
        className="mt-6 flex gap-2"
      >
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="redirect_uri" value={redirectUri} />
        <input type="hidden" name="code_challenge" value={codeChallenge} />
        <input type="hidden" name="code_challenge_method" value={codeChallengeMethod} />
        <input type="hidden" name="scope" value={scope} />
        {state ? <input type="hidden" name="state" value={state} /> : null}
        <input type="hidden" id="oauth-decision" name="decision" value="allow" />
        <button
          type="button"
          disabled={submitting}
          onClick={() => submit("deny")}
          className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-50"
        >
          Deny
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => submit("allow")}
          className="flex-1 rounded-lg bg-[#1a1a2e] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2d2d44] disabled:opacity-50"
        >
          Allow
        </button>
      </form>
    </div>
  );
}

export default function OAuthConsentPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <Suspense fallback={<p className="text-sm text-[#6B7280]">Loading…</p>}>
        <ConsentForm />
      </Suspense>
    </div>
  );
}
