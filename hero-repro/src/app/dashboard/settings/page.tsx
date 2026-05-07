"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

type ProfileState = {
  full_name: string;
  company_name: string;
  company_url: string;
  company_role: string;
  email: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileState>({
    full_name: "",
    company_name: "",
    company_url: "",
    company_role: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void fetch("/api/account/profile")
      .then((r) => r.json())
      .then((d: { ok?: boolean; profile?: ProfileState & { email?: string | null } }) => {
        if (d.ok && d.profile) {
          const p = d.profile;
          setProfile({
            full_name: p.full_name ?? "",
            company_name: p.company_name ?? "",
            company_url: p.company_url ?? "",
            company_role: p.company_role ?? "",
            email: p.email ?? "",
          });
        }
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: profile.full_name,
        company_name: profile.company_name,
        company_url: profile.company_url,
        company_role: profile.company_role,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => {
    await createSupabaseBrowserClient().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="max-w-[560px] mx-auto px-6 py-10">
      <h1 className="text-[20px] font-bold text-[#1a1a2e] mb-1">Account settings</h1>
      <p className="text-[14px] text-[#71717a] mb-8">Manage your profile and company details.</p>

      <div className="bg-white rounded-2xl border border-[#f0f0f0] p-6 space-y-4 mb-4">
        <h2 className="text-[13px] font-semibold text-[#1a1a2e]">Profile</h2>

        {(
          [
            { key: "full_name" as const, label: "Full name", placeholder: "Jane Smith" },
            { key: "company_name" as const, label: "Company name", placeholder: "Acme Inc." },
            { key: "company_url" as const, label: "Company website", placeholder: "acme.com" },
          ] as const
        ).map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="text-[12px] font-medium text-[#3f3f46] block mb-1.5">{label}</label>
            <input
              type="text"
              placeholder={placeholder}
              value={profile[key]}
              onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
              className="w-full border border-[#e4e4e7] rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-colors"
            />
          </div>
        ))}

        <div>
          <label className="text-[12px] font-medium text-[#3f3f46] block mb-1.5">Your role</label>
          <select
            value={profile.company_role}
            onChange={(e) => setProfile((p) => ({ ...p, company_role: e.target.value }))}
            className="w-full border border-[#e4e4e7] rounded-xl px-3.5 py-2.5 text-[14px] text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-colors bg-white"
          >
            <option value="">Select a role...</option>
            <option value="founder">Founder / CEO</option>
            <option value="marketer">Performance Marketer</option>
            <option value="media_buyer">Media Buyer</option>
            <option value="agency">Agency / Consultant</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="text-[12px] font-medium text-[#3f3f46] block mb-1.5">Email</label>
          <input
            type="text"
            value={profile.email}
            disabled
            className="w-full border border-[#e4e4e7] rounded-xl px-3.5 py-2.5 text-[14px] text-[#a1a1aa] bg-[#fafafa]"
          />
        </div>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="bg-[#1a1a2e] text-white rounded-xl px-4 py-2.5 text-[13px] font-medium hover:bg-[#2d2d44] disabled:opacity-50 transition-colors"
        >
          {saved ? "✓ Saved" : saving ? "Saving..." : "Save changes"}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#fee2e2] p-6">
        <h2 className="text-[13px] font-semibold text-[#1a1a2e] mb-1">Sign out</h2>
        <p className="text-[13px] text-[#71717a] mb-3">You will be redirected to the login page.</p>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="border border-[#fca5a5] text-[#dc2626] rounded-xl px-4 py-2 text-[13px] font-medium hover:bg-[#fef2f2] transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
