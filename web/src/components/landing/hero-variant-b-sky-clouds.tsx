/** Barely-there sky wisps — white on the existing blue wash, faded toward the bottom. */
export function HeroVariantBSkyClouds() {
  return (
    <div
      aria-hidden
      className="hero-variant-b-sky-clouds pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Upper sky haze */}
      <div className="absolute inset-x-0 top-0 h-[42%] bg-[radial-gradient(ellipse_90%_70%_at_50%_0%,rgba(255,255,255,0.14),transparent_68%)]" />

      {/* Desktop: soft cloud banks — mobile uses gradient-only to avoid heavy blur paint. */}
      <div className="max-md:hidden">
        <div className="absolute -left-[8%] top-[10%] h-[22%] w-[52%] rounded-[50%] bg-[rgba(255,255,255,0.11)] blur-[72px]" />
        <div className="absolute left-[18%] top-[6%] h-[16%] w-[38%] rounded-[48%] bg-[rgba(240,248,255,0.09)] blur-[64px]" />
        <div className="absolute -right-[6%] top-[14%] h-[20%] w-[48%] rounded-[52%] bg-[rgba(255,255,255,0.1)] blur-[78px]" />
        <div className="absolute right-[12%] top-[22%] h-[14%] w-[34%] rounded-[46%] bg-[rgba(227,241,248,0.12)] blur-[58px]" />
        <div className="absolute left-[6%] top-[34%] h-[18%] w-[44%] rounded-[50%] bg-[rgba(255,255,255,0.07)] blur-[88px]" />
        <div className="absolute right-[4%] top-[30%] h-[16%] w-[40%] rounded-[50%] bg-[rgba(255,255,255,0.06)] blur-[80px]" />
        <div className="absolute left-1/2 top-[38%] h-[12%] w-[56%] -translate-x-1/2 rounded-[50%] bg-[rgba(211,233,244,0.08)] blur-[96px]" />
        <div className="absolute -left-[4%] top-[48%] h-[14%] w-[36%] rounded-[50%] bg-[rgba(255,255,255,0.05)] blur-[70px]" />
        <div className="absolute right-[8%] top-[44%] h-[12%] w-[32%] rounded-[50%] bg-[rgba(255,255,255,0.04)] blur-[66px]" />
      </div>

      {/* Mobile: lightweight wisps without filter blur */}
      <div className="md:hidden">
        <div className="absolute -left-[10%] top-[12%] h-[18%] w-[55%] rounded-[50%] bg-[rgba(255,255,255,0.08)]" />
        <div className="absolute -right-[8%] top-[18%] h-[16%] w-[50%] rounded-[50%] bg-[rgba(255,255,255,0.06)]" />
        <div className="absolute left-1/2 top-[32%] h-[14%] w-[70%] -translate-x-1/2 rounded-[50%] bg-[rgba(211,233,244,0.07)]" />
      </div>
    </div>
  );
}
