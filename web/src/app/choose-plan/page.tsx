import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** Legacy route — redirects to awaiting-quote. */
export default async function ChoosePlanPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const next = firstParam(params.next);
  const qs = new URLSearchParams();
  if (next) qs.set("next", next);
  const checkoutError = firstParam(params.checkout_error);
  if (checkoutError) qs.set("checkout_error", checkoutError);
  redirect(`/awaiting-quote${qs.toString() ? `?${qs.toString()}` : ""}`);
}
