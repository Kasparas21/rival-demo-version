import Image from "next/image";

type Props = {
  ariaLabel: string;
};

export function TrustpilotRating({ ariaLabel }: Props) {
  return (
    <Image
      src="/landing/trustpilot/trust-pilot-stacked-black.png"
      alt={ariaLabel}
      width={1024}
      height={476}
      className="h-auto w-[88px] shrink-0 sm:w-[96px]"
      sizes="96px"
      loading="lazy"
      decoding="async"
    />
  );
}
