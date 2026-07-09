/** Solid white bridge under the hero - marquee overlaps with its own top fade. */
export function LandingHeroTransition() {
  return (
    <div
      aria-hidden
      className="relative z-20 h-10 w-full shrink-0 bg-white sm:h-12"
    />
  );
}

/**
 * One continuous backdrop from the hero hand-off through the logo strip and all
 * below-fold sections. Pixel-based stops keep the white→tint fade smooth regardless
 * of total page height (percentage stops on a short marquee div caused a hard band).
 */
export function LandingPostHeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0px,#ffffff_200px,#fefefe_260px,#f9fbfe_340px,#f7fbff_440px,#fafcff_620px,#f5faf6_100%)]" />
      <div className="absolute -left-32 top-[14rem] h-[28rem] w-[28rem] rounded-full bg-[#4a7fa5]/12 max-md:opacity-60 md:blur-[120px]" />
      <div className="absolute -right-24 top-[18rem] h-80 w-80 rounded-full bg-[#95C14B]/14 max-md:opacity-55 md:blur-[110px]" />
      <div className="absolute left-1/2 top-[22rem] h-72 w-[36rem] -translate-x-1/2 rounded-full bg-[#dbeafe]/45 max-md:hidden md:blur-[100px]" />
      <div className="absolute -left-20 top-[48%] h-80 w-80 rounded-full bg-[#4a7fa5]/10 max-md:hidden md:blur-[100px]" />
      <div className="absolute -right-16 top-[62%] h-72 w-72 rounded-full bg-[#95C14B]/12 max-md:hidden md:blur-[90px]" />
      <div className="absolute left-1/3 top-[78%] h-96 w-96 rounded-full bg-[#dbeafe]/50 max-md:hidden md:blur-[100px]" />
      <div className="absolute -right-32 bottom-[2%] h-80 w-80 rounded-full bg-[#4a7fa5]/12 max-md:opacity-50 md:blur-[100px]" />
    </div>
  );
}

/** Shared soft mesh gradient used across all post-hero landing sections. */
export function LandingPageBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#f7fbff] via-[#fafcff] via-[18%] to-[#f4fbf4]" />
      <div className="absolute -left-32 top-[2%] h-[28rem] w-[28rem] rounded-full bg-[#4a7fa5]/14 max-md:opacity-70 md:blur-[110px]" />
      <div className="absolute -right-24 top-[12%] h-80 w-80 rounded-full bg-[#95C14B]/16 max-md:opacity-60 md:blur-[100px]" />
      <div className="absolute left-1/2 top-[28%] h-72 w-[36rem] -translate-x-1/2 rounded-full bg-[#dbeafe]/55 max-md:hidden md:blur-[90px]" />
      <div className="absolute -left-20 top-[48%] h-80 w-80 rounded-full bg-[#4a7fa5]/10 max-md:hidden md:blur-[100px]" />
      <div className="absolute -right-16 top-[62%] h-72 w-72 rounded-full bg-[#95C14B]/12 max-md:hidden md:blur-[90px]" />
      <div className="absolute left-1/3 top-[78%] h-96 w-96 rounded-full bg-[#dbeafe]/50 max-md:hidden md:blur-[100px]" />
      <div className="absolute -right-32 bottom-[2%] h-80 w-80 rounded-full bg-[#4a7fa5]/12 max-md:opacity-50 md:blur-[100px]" />
    </div>
  );
}

export function LandingSectionDivider() {
  return <div aria-hidden className="h-px w-full shrink-0 bg-white" />;
}
