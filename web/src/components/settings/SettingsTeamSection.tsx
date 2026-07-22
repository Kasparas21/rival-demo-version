"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, UserPlus, Users, XCircle } from "lucide-react";

import {
  SettingsFieldHint,
  SettingsFieldLabel,
  SettingsGlassBanner,
  SettingsGlassButton,
  SettingsGlassInsetPanel,
  SettingsGlassSection,
  settingsGlassInputClass,
} from "@/components/settings/settings-glass-ui";

type TeamMember = {
  id: string;
  invited_email: string;
  member_user_id: string | null;
  status: string;
  created_at: string;
  accepted_at: string | null;
  memberName: string | null;
  memberEmail: string;
};

type TeamLimits = {
  maxTeamViewers: number;
  used: number;
};

export function SettingsTeamSection() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [limits, setLimits] = useState<TeamLimits | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team/members", { credentials: "include" });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        members?: TeamMember[];
        limits?: TeamLimits;
      };
      if (!res.ok || json.ok === false) {
        throw new Error(json.error ?? "Could not load team members");
      }
      setMembers(json.members ?? []);
      setLimits(json.limits ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load team members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const invite = async () => {
    setInviting(true);
    setMessage(null);
    setError(null);
    try {
      const invitedEmailTrimmed = email.trim();
      const res = await fetch("/api/team/invite", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: invitedEmailTrimmed }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        resent?: boolean;
        emailSent?: boolean;
        invitedEmail?: string;
      };
      if (!res.ok || json.ok === false) {
        throw new Error(json.error ?? "Invite failed");
      }
      setEmail("");
      const target = json.invitedEmail ?? invitedEmailTrimmed;
      setMessage(
        json.resent
          ? `Reminder email sent to ${target}. They can accept from their inbox.`
          : `Invite email sent to ${target}. They'll get a link to accept and choose a workspace.`,
      );
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  };

  const revoke = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/team/members/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) {
        throw new Error(json.error ?? "Could not revoke access");
      }
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke access");
    }
  };

  const max = limits?.maxTeamViewers ?? 0;
  const used = limits?.used ?? 0;

  return (
    <SettingsGlassSection
      icon={Users}
      title="Team viewers"
      subtitle="Invite read-only teammates to browse your scraped competitors, ads, and AI insights. Scraping stays on your account."
    >
      {max <= 0 ? (
        <SettingsGlassBanner tone="info">
          Team viewers are not included on your current plan. Upgrade to invite read-only teammates to your
          workspace.
        </SettingsGlassBanner>
      ) : (
        <>
          <SettingsGlassInsetPanel>
            <SettingsFieldLabel htmlFor="team-invite-email">Invite by email</SettingsFieldLabel>
            <SettingsFieldHint>
              We email them from hello@spy-rival.com with a one-click accept link. They get read-only access to
              your workspace and can keep their own account too. ({used}/{max} seats used)
            </SettingsFieldHint>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                id="team-invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="boss@company.com"
                className={settingsGlassInputClass}
              />
              <SettingsGlassButton
                type="button"
                disabled={inviting || !email.trim() || used >= max}
                onClick={() => void invite()}
                className="inline-flex shrink-0 items-center justify-center gap-2"
              >
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Invite viewer
              </SettingsGlassButton>
            </div>
          </SettingsGlassInsetPanel>

          {message ? <SettingsGlassBanner tone="success">{message}</SettingsGlassBanner> : null}
          {error ? <SettingsGlassBanner tone="error">{error}</SettingsGlassBanner> : null}

          <div className="mt-4 space-y-2">
            {loading ? (
              <p className="text-[13px] text-slate-600">Loading team…</p>
            ) : members.length === 0 ? (
              <p className="text-[13px] text-slate-600">No viewers invited yet.</p>
            ) : (
              members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/70 bg-white/50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-slate-900">
                      {m.memberName ?? m.memberEmail}
                    </p>
                    <p className="text-[11px] text-slate-500 capitalize">{m.status}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void revoke(m.id)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Revoke
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </SettingsGlassSection>
  );
}
