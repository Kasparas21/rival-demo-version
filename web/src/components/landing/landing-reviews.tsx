import Image from "next/image";
import { BadgeCheck } from "lucide-react";

import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";
import { TrustpilotRating } from "@/components/landing/trustpilot-rating";
import { fillCopyTemplate } from "@/lib/i18n/fill-copy-template";
import type { LandingCopy, LandingReview } from "@/lib/i18n/landing/types";

type Props = {
  copy: LandingCopy["reviews"];
};

const CARD_IMAGE_CLASS: Record<NonNullable<LandingReview["cardSize"]> | "peek", string> = {
  default: "aspect-[5/3.4] sm:aspect-[5/3.5]",
  tall: "aspect-[4/4.9] sm:aspect-[4/5.2]",
  tallest: "aspect-[4/6.2] sm:aspect-[4/6.8]",
  peek: "aspect-[5/3.5]",
};

function ReviewAvatar({
  review,
  photoAltTemplate,
  size = "md",
  muted = false,
}: {
  review: LandingReview;
  photoAltTemplate: string;
  size?: "md" | "sm";
  muted?: boolean;
}) {
  const dim = size === "sm" ? "size-8" : "size-10";
  const text = size === "sm" ? "text-[11px]" : "text-sm";

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-[#f4f4f5] ring-2 ring-white ${dim} ${muted ? "opacity-50" : ""}`}
    >
      {review.photo ? (
        <Image
          src={review.photo}
          alt={fillCopyTemplate(photoAltTemplate, { name: review.name })}
          width={80}
          height={80}
          className="size-full object-cover"
          sizes={size === "sm" ? "32px" : "40px"}
        />
      ) : (
        <span
          className={`flex size-full items-center justify-center font-semibold text-[#4a7fa5] ${text}`}
        >
          {review.initials ?? review.name.charAt(0)}
        </span>
      )}
    </div>
  );
}

function ReviewCard({
  review,
  photoAltTemplate,
  featureImageAltTemplate,
  mobileHero = false,
}: {
  review: LandingReview;
  photoAltTemplate: string;
  featureImageAltTemplate: string;
  mobileHero?: boolean;
}) {
  const peek = review.peek && !mobileHero;
  const sizeKey = peek ? "peek" : (review.cardSize ?? "default");
  const imageAspect = mobileHero ? "aspect-[4/3.2] sm:aspect-[4/3]" : CARD_IMAGE_CLASS[sizeKey];
  const imageAlt =
    review.featureImageAlt ?? fillCopyTemplate(featureImageAltTemplate, { name: review.name });

  return (
    <article
      className={`relative break-inside-avoid overflow-hidden rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_20px_-6px_rgba(26,26,26,0.1)] sm:p-7 ${
        peek ? "border-black/[0.03] shadow-none" : ""
      }`}
    >
      <div className={peek ? "opacity-[0.34]" : undefined}>
        <div className="flex items-center gap-3">
          <ReviewAvatar review={review} photoAltTemplate={photoAltTemplate} muted={peek} />
          <div className="flex min-w-0 items-center gap-1.5">
            <p
              className={`truncate text-[15px] font-bold ${peek ? "text-[#a1a1aa]" : "text-[#1a1a1a]"}`}
            >
              {review.name}
            </p>
            {review.verified && !peek ? (
              <BadgeCheck
                className="size-4 shrink-0 fill-[#2563eb] text-white"
                strokeWidth={2.25}
                aria-label="Verified"
              />
            ) : null}
          </div>
        </div>

        <p
          className={`mt-4 text-[14px] leading-relaxed ${peek ? "text-[#d4d4d8]" : "text-[#3f3f46]"}`}
        >
          {review.text}
        </p>

        <div className="relative mt-5 overflow-hidden rounded-xl ring-1 ring-black/[0.05]">
          <div className={`relative w-full bg-gradient-to-br from-[#f4f4f5] via-[#ececef] to-[#e4e4e7] ${imageAspect}`}>
            {review.featureImage ? (
              <Image
                src={review.featureImage}
                alt={imageAlt}
                fill
                className={`object-cover ${sizeKey === "default" ? "object-center" : "object-top"}`}
                sizes={mobileHero ? "(max-width: 640px) 100vw, 33vw" : "(max-width: 1024px) 100vw, 320px"}
                loading="lazy"
                decoding="async"
              />
            ) : null}
          </div>
          {mobileHero ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white via-white/80 to-transparent sm:hidden"
            />
          ) : null}
        </div>

        <p className={`mt-4 text-[12px] ${peek ? "text-[#e4e4e7]" : "text-[#a1a1aa]"}`}>
          {review.meta}
        </p>
      </div>

      {peek ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/5 via-[#f7f7f8]/50 to-[#f7f7f8]"
        />
      ) : null}
    </article>
  );
}

function SocialProofBar({
  copy,
  facePile,
  layout,
}: {
  copy: LandingCopy["reviews"];
  facePile: LandingReview[];
  layout: "mobile" | "desktop";
}) {
  const avatars = (
    <div className="flex items-center pl-1">
      {facePile.map((review, index) => (
        <div
          key={review.name}
          className={index > 0 ? "-ml-2.5" : undefined}
          style={{ zIndex: facePile.length - index }}
        >
          <ReviewAvatar review={review} photoAltTemplate={copy.photoAlt} size="sm" />
        </div>
      ))}
    </div>
  );

  const count = (
    <p className="text-sm text-[#3f3f46] sm:text-[15px]">
      <span className="font-bold text-[#1a1a1a]">{copy.socialProof.count}</span>{" "}
      {copy.socialProof.label}
    </p>
  );

  const trustpilot = <TrustpilotRating ariaLabel={copy.socialProof.trustpilotAria} />;

  if (layout === "mobile") {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="inline-flex items-center gap-3 rounded-full border border-black/[0.08] bg-white px-3 py-2 shadow-[0_2px_16px_-6px_rgba(26,26,26,0.1)]">
          {avatars}
          {count}
        </div>
        {trustpilot}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-black/[0.08] bg-white py-2.5 pl-3 pr-3 shadow-[0_2px_16px_-6px_rgba(26,26,26,0.1)] sm:gap-4">
      {avatars}
      {count}
      <span aria-hidden className="h-5 w-px bg-[#e4e4e7]" />
      {trustpilot}
    </div>
  );
}

export function LandingReviews({ copy }: Props) {
  const facePile = copy.items.filter((r) => r.photo && !r.peek).slice(0, 4);
  const mobileFeatured = copy.items.find((r) => r.verified) ?? copy.items[0];

  const leftReview = copy.items.find((r) => r.cardSize === "tall");
  const rightReview = copy.items.find((r) => r.cardSize === "tallest");
  const centerReview = copy.items.find((r) => !r.cardSize && !r.peek);
  const peekReviews = copy.items.filter((r) => r.peek);

  const cardProps = {
    photoAltTemplate: copy.photoAlt,
    featureImageAltTemplate: copy.featureImageAlt,
  };

  return (
    <section className="relative overflow-hidden bg-[#f7f7f8] py-14 text-center sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-[#ede9fe]/60 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-16 h-64 w-64 rounded-full bg-[#fce7f3]/50 blur-[90px]"
      />

      <LandingScrollReveal className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <h2
          id="reviews"
          className={`${landingNavAnchorScrollClasses} text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-3xl`}
        >
          {copy.title}
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-[#71717a] sm:text-base">{copy.subtitle}</p>

        <div className="mt-8 text-left sm:hidden">
          <ReviewCard
            review={mobileFeatured}
            photoAltTemplate={copy.photoAlt}
            featureImageAltTemplate={copy.featureImageAlt}
            mobileHero
          />
        </div>

        <div className="relative mt-12 hidden sm:block">
          <div className="relative max-h-[min(700px,74vh)] overflow-hidden">
            <div className="grid grid-cols-3 items-start gap-5 text-left lg:gap-6">
              <div>{leftReview ? <ReviewCard review={leftReview} {...cardProps} /> : null}</div>
              <div className="flex flex-col gap-5 lg:gap-6">
                {centerReview ? <ReviewCard review={centerReview} {...cardProps} /> : null}
                {peekReviews.map((review) => (
                  <ReviewCard key={review.name} review={review} {...cardProps} />
                ))}
              </div>
              <div>{rightReview ? <ReviewCard review={rightReview} {...cardProps} /> : null}</div>
            </div>

            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[58%] max-h-[26rem] bg-[linear-gradient(to_top,#f7f7f8_0%,#f7f7f8_38%,rgba(247,247,248,0.92)_52%,rgba(247,247,248,0.55)_68%,transparent_100%)]"
            />
          </div>
        </div>

        <div className="relative z-20 mt-8 flex justify-center sm:-mt-2">
          <div className="sm:hidden">
            <SocialProofBar copy={copy} facePile={facePile} layout="mobile" />
          </div>
          <div className="hidden sm:block">
            <SocialProofBar copy={copy} facePile={facePile} layout="desktop" />
          </div>
        </div>
      </LandingScrollReveal>
    </section>
  );
}
