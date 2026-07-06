import Image from "next/image";
import { BadgeCheck, Plus } from "lucide-react";

import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";
import { fillCopyTemplate } from "@/lib/i18n/fill-copy-template";
import type { LandingCopy, LandingReview } from "@/lib/i18n/landing/types";

type Props = {
  copy: LandingCopy["reviews"];
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
  const tall = review.tall && !mobileHero;
  const peek = review.peek && !mobileHero;
  const imageAspect = mobileHero
    ? "aspect-[4/3.2] sm:aspect-[4/3]"
    : tall
      ? "aspect-[4/4.6] sm:aspect-[4/4.8]"
      : peek
        ? "aspect-[4/3.2]"
        : "aspect-[4/3]";

  return (
    <article
      className={`relative break-inside-avoid overflow-hidden rounded-[1.25rem] border border-black/[0.06] bg-white p-6 shadow-[0_2px_24px_-8px_rgba(26,26,26,0.12)] sm:p-7 ${
        peek ? "border-black/[0.03] shadow-none" : ""
      }`}
    >
      <div className={peek ? "opacity-[0.38]" : undefined}>
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
          {review.featureImage ? (
            <div className={`relative w-full ${imageAspect}`}>
              <Image
                src={review.featureImage}
                alt={fillCopyTemplate(featureImageAltTemplate, { name: review.name })}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
            </div>
          ) : (
            <div
              className={`w-full bg-gradient-to-br from-[#f4f4f5] via-[#ececef] to-[#e4e4e7] ${imageAspect}`}
              aria-hidden
            />
          )}
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
          className="pointer-events-none absolute inset-0 rounded-[1.25rem] bg-gradient-to-b from-white/10 via-[#f7f7f8]/55 to-[#f7f7f8]"
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

  const viewMore = (
    <button
      type="button"
      className="inline-flex items-center gap-2 text-sm font-medium text-[#1a1a1a] transition-opacity hover:opacity-70"
    >
      {copy.socialProof.viewMore}
      <span className="flex size-7 items-center justify-center rounded-full bg-[#1a1a1a] text-white">
        <Plus className="size-3.5" strokeWidth={2.5} aria-hidden />
      </span>
    </button>
  );

  if (layout === "mobile") {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="inline-flex items-center gap-3 rounded-full border border-black/[0.08] bg-white px-3 py-2 shadow-[0_2px_16px_-6px_rgba(26,26,26,0.1)]">
          {avatars}
          {count}
        </div>
        {viewMore}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-black/[0.08] bg-white py-2.5 pl-3 pr-3 shadow-[0_2px_16px_-6px_rgba(26,26,26,0.1)] sm:gap-4">
      {avatars}
      {count}
      <span aria-hidden className="h-5 w-px bg-[#e4e4e7]" />
      {viewMore}
    </div>
  );
}

export function LandingReviews({ copy }: Props) {
  const facePile = copy.items.filter((r) => r.photo && !r.peek).slice(0, 4);
  const mobileFeatured = copy.items.find((r) => r.verified) ?? copy.items[0];

  const tallReviews = copy.items.filter((r) => r.tall);
  const leftReview = tallReviews[0];
  const rightReview = tallReviews[1];
  const centerReview = copy.items.find((r) => !r.tall && !r.peek);
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

        <div className="relative mt-12 hidden sm:mt-12 sm:block">
          <div className="grid grid-cols-3 gap-6 pb-10 text-left lg:gap-7">
            <div>{leftReview ? <ReviewCard review={leftReview} {...cardProps} /> : null}</div>
            <div className="flex flex-col gap-6">
              {centerReview ? <ReviewCard review={centerReview} {...cardProps} /> : null}
              {peekReviews.map((review) => (
                <ReviewCard key={review.name} review={review} {...cardProps} />
              ))}
            </div>
            <div>{rightReview ? <ReviewCard review={rightReview} {...cardProps} /> : null}</div>
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-48 bg-gradient-to-t from-[#f7f7f8] from-[35%] via-[#f7f7f8]/92 to-transparent sm:h-56"
          />
        </div>

        <div className="relative z-20 mt-8 flex justify-center sm:-mt-4">
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
