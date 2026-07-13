import Link from "next/link";

type Props = {
  checkoutError: string | null;
  checkoutHref: string | null;
  priceLabel: string | null;
  billingPeriod: string | null;
  nextPath: string;
};

export function AwaitingQuoteContent({
  checkoutError,
  checkoutHref,
  priceLabel,
  billingPeriod,
  nextPath,
}: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-12 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900/80 p-8 shadow-xl backdrop-blur">
        <h1 className="text-2xl font-semibold tracking-tight">
          {checkoutHref ? "Your custom plan is ready" : "We are preparing your custom plan"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          {checkoutHref
            ? "After your sales call we built a subscription tailored to your usage. Complete checkout to unlock full access."
            : "Our team will send you a checkout link after your call. You can keep exploring on the free trial in the meantime."}
        </p>

        {checkoutError ? (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {checkoutError}
          </p>
        ) : null}

        {checkoutHref && priceLabel ? (
          <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
            <p className="text-sm text-zinc-400">Your price</p>
            <p className="mt-1 text-3xl font-semibold">
              {priceLabel}
              <span className="text-base font-normal text-zinc-500">
                /{billingPeriod === "annual" ? "year" : "month"}
              </span>
            </p>
            <Link
              href={checkoutHref}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-900"
            >
              Continue to checkout
            </Link>
          </div>
        ) : (
          <Link
            href={nextPath}
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-white/20 px-4 py-3 text-sm font-medium text-white hover:bg-white/5"
          >
            Continue to dashboard
          </Link>
        )}

        {!checkoutHref ? (
          <p className="mt-4 text-center text-xs text-zinc-500">
            Questions? Reply to your onboarding email and we will send your link.
          </p>
        ) : null}
      </div>
    </div>
  );
}
