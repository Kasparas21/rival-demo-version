import LandingHome from "@/components/marketing/landing-home";
import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const hasAuthParams = Boolean(
    firstParam(params.code) ||
      firstParam(params.token_hash) ||
      firstParam(params.error) ||
      firstParam(params.error_description)
  );

  if (hasAuthParams) {
    const callbackParams = new URLSearchParams();
    for (const key of ["code", "token_hash", "type", "error", "error_description", "next"]) {
      const value = firstParam(params[key]);
      if (value) callbackParams.set(key, value);
    }
    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  return <LandingHome />;
}
