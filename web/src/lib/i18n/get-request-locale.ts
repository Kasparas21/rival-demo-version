import { cookies, headers } from "next/headers";

import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { LOCALE_COOKIE, LOCALE_HEADER, parseLocale, type Locale } from "@/lib/i18n/locale";

/** Server-side locale for the current request (middleware header, then cookie, then geo). */
export async function getRequestLocale(): Promise<Locale> {
  const headerStore = await headers();
  const fromMiddleware = headerStore.get(LOCALE_HEADER);
  if (fromMiddleware) return parseLocale(fromMiddleware);

  const cookieStore = await cookies();
  const cookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const country = headerStore.get("x-vercel-ip-country");

  return resolveLocale({ cookie, country });
}
