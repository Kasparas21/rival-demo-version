"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { glassPillShellClass } from "@/components/ui/glass-styles";
import {
  isPlausiblePublicHostname,
  normalizedWorkspaceHost,
  sanitizeCompanyUrlInput,
} from "@/lib/onboarding/host";

type LandingSpySearchBarProps = {
  inputId: string;
};

/** Hero brand field: validate domain → `/onboarding` (login if needed). */
export function LandingSpySearchBar({ inputId }: LandingSpySearchBarProps) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const sanitized = sanitizeCompanyUrlInput(value);
    setValue(sanitized);
    const host = normalizedWorkspaceHost(sanitized);
    if (!host) {
      setError("Enter your brand domain.");
      return;
    }
    if (!isPlausiblePublicHostname(host)) {
      setError("Use a real domain, e.g. nike.com or shop.brand.com.");
      return;
    }
    setError(null);
    router.push("/onboarding");
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <form
        onSubmit={onSubmit}
        className={`${glassPillShellClass} relative flex flex-col gap-2 rounded-3xl px-3 py-3 sm:flex-row sm:items-center sm:rounded-full sm:px-4 sm:py-2`}
        noValidate
      >
        <Search className="pointer-events-none absolute left-5 top-6 size-5 text-gray-400 sm:left-4 sm:top-1/2 sm:-translate-y-1/2" aria-hidden strokeWidth={2} />
        <label htmlFor={inputId} className="sr-only">
          Brand domain
        </label>
        <input
          id={inputId}
          name="brand"
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="Enter your brand domain"
          value={value}
          onChange={(e) => {
            setValue(sanitizeCompanyUrlInput(e.target.value));
            if (error) setError(null);
          }}
          className="min-h-12 w-full min-w-0 flex-1 border-0 bg-transparent py-3 pl-9 pr-2 text-base text-[#1a1a1a] outline-none placeholder:text-gray-400 sm:pl-8"
        />
        <button
          type="submit"
          className="inline-flex w-full shrink-0 items-center justify-center rounded-full border border-white/15 bg-[#1a1a1a] px-7 py-3 font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-black hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a7fa5] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:w-auto sm:py-2.5"
        >
          Start
        </button>
      </form>
      {error ? (
        <p className="mt-2 px-1 text-left text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
