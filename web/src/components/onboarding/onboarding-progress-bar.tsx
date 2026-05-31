type Props = {
  /** 0–100 */
  value: number;
};

/**
 * Silent onboarding progress — no visible labels or numbers.
 * Track + black fill, ~600ms ease-out on step changes.
 */
export function OnboardingProgressBar({ value }: Props) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="mx-auto w-[88%] sm:w-[min(72%,28rem)]">
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-[#E8E6E1]"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Onboarding progress"
      >
        <div
          className="h-full rounded-full bg-gray-900 transition-[width] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
