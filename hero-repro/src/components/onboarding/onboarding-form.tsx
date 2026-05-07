"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  userId: string;
  initialData: {
    full_name?: string | null;
    company_name?: string | null;
    company_url?: string | null;
    company_role?: string | null;
  } | null;
};

/* Match login card: dark text on light glass (white-on-white was unreadable on bg-white/40). */
const glassInputClass =
  "w-full rounded-2xl border border-white/60 bg-white/35 px-4 py-2.5 text-[15px] font-medium text-gray-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_4px_24px_rgba(31,38,135,0.05)] outline-none placeholder:text-gray-600 transition focus:border-white/75 focus:bg-white/45 focus:ring-2 focus:ring-gray-900/10";

const glassSelectClass =
  "w-full rounded-2xl border border-white/60 bg-white/35 px-4 py-2.5 text-[15px] font-medium text-gray-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_4px_24px_rgba(31,38,135,0.05)] outline-none transition focus:border-white/75 focus:bg-white/45 focus:ring-2 focus:ring-gray-900/10 [&>option]:bg-white [&>option]:text-gray-900";

export function OnboardingForm({ userId, initialData }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: initialData?.full_name ?? "",
    company_name: initialData?.company_name ?? "",
    company_url: initialData?.company_url ?? "",
    company_role: initialData?.company_role ?? "",
  });

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim() || null,
        company_name: form.company_name.trim(),
        company_url: form.company_url.trim() || null,
        company_role: form.company_role.trim() || null,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      setSaving(false);
      setError(profileError.message);
      return;
    }

    if (form.company_name.trim()) {
      const { error: brandError } = await supabase
        .from("brands")
        .update({
          name: form.company_name.trim(),
          domain: form.company_url.trim() || null,
        })
        .eq("user_id", userId)
        .eq("is_primary", true);

      if (brandError) {
        setSaving(false);
        setError(brandError.message);
        return;
      }
    }

    setSaving(false);
    router.push("/dashboard");
    router.refresh();
  };

  const continueStep0 = () => {
    setError(null);
    if (!form.full_name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!form.company_role.trim()) {
      setError("Please select your role.");
      return;
    }
    setStep(1);
  };

  return (
    <div className="w-full rounded-[28px] border border-white/60 bg-white/40 px-7 py-9 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md transition-all duration-300 sm:px-10 sm:py-10">
      <div className="mb-6 flex items-center gap-1.5">
        {[0, 1].map((i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? "w-6 bg-gray-900" : i < step ? "w-3 bg-gray-900/50" : "w-3 bg-gray-900/15"
            }`}
          />
        ))}
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-[#b42318]">
          {error}
        </p>
      ) : null}

      <div key={step} className="rival-onboarding-step-in">
        {step === 0 ? (
          <>
            <div className="mb-8">
              <h1 className="text-[22px] font-semibold tracking-tight text-gray-900">Tell us about yourself</h1>
              <p className="mt-1 text-[14px] font-medium leading-relaxed text-gray-600">
                This personalizes your Rival workspace.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="onb-full-name" className="mb-1.5 block text-[13px] font-semibold text-gray-900">
                  Your name
                </label>
                <input
                  id="onb-full-name"
                  type="text"
                  placeholder="Jane Smith"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className={glassInputClass}
                />
              </div>

              <div>
                <label htmlFor="onb-role" className="mb-1.5 block text-[13px] font-semibold text-gray-900">
                  Your role
                </label>
                <select
                  id="onb-role"
                  value={form.company_role}
                  onChange={(e) => setForm((f) => ({ ...f, company_role: e.target.value }))}
                  className={glassSelectClass}
                >
                  <option value="">Select a role...</option>
                  <option value="founder">Founder / CEO</option>
                  <option value="marketer">Performance Marketer</option>
                  <option value="media_buyer">Media Buyer</option>
                  <option value="agency">Agency / Consultant</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void continueStep0()}
              className="mt-6 w-full rounded-full bg-gray-900 py-3.5 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              Continue →
            </button>
          </>
        ) : (
          <>
            <div className="mb-8">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep(0);
                }}
                className="mb-3 text-[13px] font-medium text-gray-600 transition-colors hover:text-gray-900"
              >
                ← Back
              </button>
              <h1 className="text-[22px] font-semibold tracking-tight text-gray-900">Where do you run ads?</h1>
              <p className="mt-1 text-[14px] font-medium leading-relaxed text-gray-600">
                We&apos;ll track competitors in your space.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="onb-company" className="mb-1.5 block text-[13px] font-semibold text-gray-900">
                  Company name
                </label>
                <input
                  id="onb-company"
                  type="text"
                  placeholder="Acme Inc."
                  value={form.company_name}
                  onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                  className={glassInputClass}
                />
              </div>

              <div>
                <label htmlFor="onb-url" className="mb-1.5 block text-[13px] font-semibold text-gray-900">
                  Company website
                </label>
                <input
                  id="onb-url"
                  type="text"
                  placeholder="acme.com"
                  value={form.company_url}
                  onChange={(e) => setForm((f) => ({ ...f, company_url: e.target.value }))}
                  className={glassInputClass}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving || !form.company_name.trim()}
              className="mt-6 w-full rounded-full bg-gray-900 py-3.5 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              {saving ? "Setting up your workspace..." : "Get started →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
