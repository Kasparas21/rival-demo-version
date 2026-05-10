/**
 * Decorative “fake dashboard” behind the post-onboarding pricing gate (not real data).
 */
export function PricingGateDashboardMock() {
  return (
    <div className="flex h-full min-h-[480px] w-full flex-col gap-4 p-6 sm:p-8" aria-hidden>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-9 w-44 max-w-[55%] rounded-xl bg-gradient-to-r from-gray-200/90 to-gray-100/80" />
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-lg bg-white/70 ring-1 ring-gray-200/80" />
          <div className="h-9 w-24 rounded-lg bg-[#DDF1FD]/80 ring-1 ring-[#b8daf0]/60" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {["w-[78%]", "w-[65%]", "w-[72%]"].map((w, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/70 bg-white/55 p-4 shadow-sm ring-1 ring-gray-200/40"
          >
            <div className="mb-3 h-3 w-24 rounded bg-gray-200/90" />
            <div className={`mb-2 h-8 rounded-lg bg-gray-300/50 ${w}`} />
            <div className="h-2 w-full rounded-full bg-gray-100/90" />
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-5 lg:min-h-0">
        <div className="flex min-h-[200px] flex-col rounded-2xl border border-white/70 bg-white/50 p-4 shadow-sm ring-1 ring-gray-200/35 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="h-3 w-32 rounded bg-gray-200/85" />
            <div className="h-8 w-28 rounded-lg bg-gray-100/90" />
          </div>
          <div className="relative mt-auto flex flex-1 items-end justify-between gap-1.5 px-1 pb-2">
            {[40, 65, 45, 80, 55, 72, 50, 88, 60, 75, 48, 82].map((h, j) => (
              <div
                key={j}
                className="flex-1 rounded-t-md bg-gradient-to-t from-[#4a7fa5]/35 to-[#DDF1FD]/90"
                style={{ height: `${h}%`, minHeight: "12px" }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/50 p-4 shadow-sm ring-1 ring-gray-200/35 lg:col-span-2">
          <div className="h-3 w-28 rounded bg-gray-200/85" />
          {[0, 1, 2, 3, 4].map((k) => (
            <div key={k} className="flex items-center gap-3 rounded-xl bg-white/60 py-2.5 pl-3 pr-2 ring-1 ring-gray-100/90">
              <div className="size-10 shrink-0 rounded-lg bg-gray-200/80" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-2.5 w-[70%] rounded-full bg-gray-200/75" />
                <div className="h-2 w-[45%] rounded-full bg-gray-100/95" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
