"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RivalLogoImg } from "@/components/rival-logo";
import { RivalVideoShell } from "@/components/ui/rival-video-shell";
import { glassPanelClass } from "@/components/ui/glass-styles";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const glassInputWrap =
  "mt-2 rounded-2xl border border-white/60 bg-white/35 px-4 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_4px_24px_rgba(31,38,135,0.05)] backdrop-blur-sm transition focus-within:border-white/75 focus-within:bg-white/45 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_4px_28px_rgba(31,38,135,0.08)]";

const glassInputField =
  "w-full border-none bg-transparent py-3 text-[15px] font-medium tracking-wide text-gray-900 outline-none placeholder:text-gray-600 focus:ring-0";

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (!password) {
      setFormError("Choose a new password.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords don't match.");
      return;
    }

    setPending(true);
    setFormError(null);

    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    await supabase.auth.signOut();
    router.refresh();
    router.replace("/login?notice=password_reset");
  };

  return (
    <RivalVideoShell footerTint="light">
      <Link
        href="/"
        className="mb-8 rounded-2xl border border-white/60 bg-white/40 px-5 py-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md transition-all duration-300 hover:bg-white/50 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]"
      >
        <RivalLogoImg className="h-8 w-auto max-w-[180px] object-contain object-center sm:h-9" />
      </Link>

      <div className={`w-full max-w-[440px] ${glassPanelClass}`}>
        <h2 className="text-[1.65rem] font-semibold tracking-tight text-gray-900 sm:text-[1.75rem]">
          Set a new password
        </h2>
        <p className="mt-2.5 text-[14px] font-medium leading-relaxed text-gray-600">
          Choose a new password for your account.
        </p>

        <form
          className="mt-8 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div>
            <label htmlFor="reset-password" className="text-[13px] font-semibold text-gray-900">
              New password
            </label>
            <div className={glassInputWrap}>
              <input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                placeholder="New password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={glassInputField}
              />
            </div>
          </div>

          <div>
            <label htmlFor="reset-password-confirm" className="text-[13px] font-semibold text-gray-900">
              Confirm new password
            </label>
            <div className={glassInputWrap}>
              <input
                id="reset-password-confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={glassInputField}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-0 w-full rounded-full bg-gray-900 px-5 py-3.5 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:scale-100"
          >
            {pending ? "Saving…" : "Update password"}
          </button>
        </form>

        {formError ? <p className="mt-4 text-[13px] text-[#b42318]">{formError}</p> : null}
      </div>
    </RivalVideoShell>
  );
}
