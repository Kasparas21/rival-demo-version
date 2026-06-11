import Image from "next/image";

import {
  LandingHeadlineHighlight,
  landingSectionHeadlineClasses,
} from "@/components/landing/landing-headline-highlight";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";
import { fillCopyTemplate } from "@/lib/i18n/fill-copy-template";
import type { LandingCopy, LandingReview } from "@/lib/i18n/landing/types";

const REVIEW_GLASS_CARD_CLASS =
  "relative overflow-hidden rounded-2xl border border-white/70 bg-white/50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_12px_36px_-18px_rgba(74,127,165,0.22)] backdrop-blur-2xl backdrop-saturate-[1.42] ring-1 ring-white/45 sm:p-5";

type Props = {
  copy: LandingCopy["reviews"];
};

function ReviewStars({ count, ariaLabel }: { count: LandingReview["stars"]; ariaLabel: string }) {
  return (
    <div className="flex gap-0.5 text-[13px] leading-none tracking-wider" aria-label={ariaLabel}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className={index < count ? "text-amber-400" : "text-gray-200/90"} aria-hidden>
          ★
        </span>
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  starsAriaTemplate,
  photoAltTemplate,
}: {
  review: LandingReview;
  starsAriaTemplate: string;
  photoAltTemplate: string;
}) {
  const isSatirical = review.stars === 1;

  return (
    <article className={`${REVIEW_GLASS_CARD_CLASS} flex h-full flex-col text-left`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent"
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl ${
          isSatirical ? "bg-amber-200/25" : "bg-[#7eb3d4]/20"
        }`}
      />

      <div className="relative flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-white/90 to-[#4a7fa5]/20 opacity-80 blur-[1px]" />
          <div className="relative size-9 overflow-hidden rounded-full border border-white/80 bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_12px_-4px_rgba(74,127,165,0.25)] ring-1 ring-white/60">
            {review.photo ? (
              <Image
                src={review.photo}
                alt={fillCopyTemplate(photoAltTemplate, { name: review.name })}
                width={88}
                height={88}
                className="size-full object-cover"
                sizes="44px"
              />
            ) : (
              <span className="flex size-full items-center justify-center bg-gradient-to-br from-[#eef6fc] to-white text-sm font-semibold text-[#4a7fa5]">
                {review.initials}
              </span>
            )}
          </div>
        </div>
        <div className="min-w-0 pt-0.5">
          <p className="text-sm font-semibold leading-tight text-[#1a1a1a]">
            {review.name}
            <span className="font-normal text-gray-400"> · {review.when}</span>
          </p>
          <div className="mt-1.5">
            <ReviewStars
              count={review.stars}
              ariaLabel={fillCopyTemplate(starsAriaTemplate, { count: review.stars })}
            />
          </div>
        </div>
      </div>

      <p className="relative mt-3 flex-1 text-xs leading-snug text-gray-600 sm:text-[13px] sm:leading-relaxed">
        {review.text}
      </p>
    </article>
  );
}

export function LandingReviews({ copy }: Props) {
  const featuredReviews = copy.items.slice(0, 3);

  return (
    <section className="relative overflow-hidden py-12 text-center sm:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-[10%] h-72 w-72 rounded-full bg-[#4a7fa5]/10 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-[35%] h-64 w-64 rounded-full bg-[#95C14B]/10 blur-[90px]"
      />

      <LandingScrollReveal className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <h2
          id="reviews"
          className={`${landingNavAnchorScrollClasses} ${landingSectionHeadlineClasses}`}
        >
          {copy.titleLine1}
          <br />
          <LandingHeadlineHighlight>{copy.titleHighlight}</LandingHeadlineHighlight>
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-4 text-left sm:grid-cols-3 sm:gap-5">
          {featuredReviews.map((review) => (
            <ReviewCard
              key={review.name}
              review={review}
              starsAriaTemplate={copy.starsAria}
              photoAltTemplate={copy.photoAlt}
            />
          ))}
        </div>
      </LandingScrollReveal>
    </section>
  );
}
