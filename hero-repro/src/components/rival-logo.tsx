/** Canonical Rival wordmark — source: `public/rival-logo.svg` */
export function RivalLogoImg({ className = "" }: { className?: string }) {
  return (
    <img
      src="/rival-logo.svg"
      alt="Rival"
      width={658}
      height={338}
      className={className}
    />
  );
}
