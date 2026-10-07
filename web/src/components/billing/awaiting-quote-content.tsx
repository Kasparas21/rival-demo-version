import Link from "next/link";

type Props = {
  checkoutError: string | null;
  checkoutHref: string;
  priceLabel: string;
  billingPeriod: string | null;
  isComplimentary?: boolean;
};

/** Admin-sent custom quote; users without one are sent to the plan picker before this renders. */
export function AwaitingQuoteContent({
  checkoutError,
  checkoutHref,
  priceLabel,
  billingPeriod,
  isComplimentary = false,
}: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-12 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900/80 p-8 shadow-xl backdrop-blur">
        <h1 className="text-2xl font-semibold tracking-tight">Your custom plan is ready</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          {isComplimentary
            ? "Your complimentary plan is ready. Open the link below while logged in to activate access — no payment required."
            : "After your sales call we built a subscription tailored to your usage. Complete checkout to unlock full access."}
        </p>

        {checkoutError ? (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {checkoutError}
          </p>
        ) : null}

        <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
          <p className="text-sm text-zinc-400">Your price</p>
          <p className="mt-1 text-3xl font-semibold">
            {priceLabel}
            {!isComplimentary ? (
              <span className="text-base font-normal text-zinc-500">
                /{billingPeriod === "annual" ? "year" : "month"}
              </span>
            ) : null}
          </p>
          <Link
            href={checkoutHref}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-900"
          >
            {isComplimentary ? "Activate free access" : "Continue to checkout"}
          </Link>
        </div>
      </div>
    </div>
  );
}
