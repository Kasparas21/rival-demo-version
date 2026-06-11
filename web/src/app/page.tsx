import type { Metadata } from "next";
import { redirect } from "next/navigation";

import LandingHome from "@/components/marketing/landing-home";
import { JsonLd } from "@/components/seo/JsonLd";
import { getLandingCopy } from "@/lib/i18n/landing";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { homePageJsonLdBlocks } from "@/lib/seo/home-json-ld";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function generateMetadata(): Promise<Metadata> {
  const copy = getLandingCopy(DEFAULT_LOCALE);

  return {
    title: copy.meta.title,
    description: copy.meta.description,
    alternates: { canonical: "/" },
    openGraph: {
      url: "/",
      title: copy.meta.title,
      description: copy.meta.description,
    },
    twitter: {
      title: copy.meta.title,
      description: copy.meta.description,
    },
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const copy = getLandingCopy(DEFAULT_LOCALE);
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

  return (
    <>
      {homePageJsonLdBlocks(copy).map((block, index) => (
        <JsonLd key={`${String(block["@type"])}-${index}`} data={block} />
      ))}
      <LandingHome copy={copy} locale={DEFAULT_LOCALE} />
    </>
  );
}
