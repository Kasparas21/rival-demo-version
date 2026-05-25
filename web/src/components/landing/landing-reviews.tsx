import Image from "next/image";

import { LandingHeadlineHighlight } from "@/components/landing/landing-headline-highlight";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";

const REVIEW_GLASS_CARD_CLASS =
  "relative overflow-hidden rounded-[1.35rem] border border-white/70 bg-white/50 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_18px_52px_-20px_rgba(74,127,165,0.28)] backdrop-blur-2xl backdrop-saturate-[1.42] ring-1 ring-white/45 sm:p-7";

type Review = {
  name: string;
  photo?: string;
  initials?: string;
  when: string;
  stars: 1 | 2 | 3 | 4 | 5;
  text: string;
};

const reviews: Review[] = [
  {
    name: "Marcus Chen",
    photo: "/landing/reviews/steven-guajardo.png",
    when: "1 day ago",
    stars: 5,
    text: "Rival replaced four separate subscriptions for my agency — we were running Foreplay, a Google spy tool, and two native libraries side by side. The Three Moves report is the part that earns its keep: instead of sending clients a vague \"test more video,\" I paste in the exact competitor ad that's been running 90+ days and explain why it works. Clients stopped questioning the retainer. Hours back every month.",
  },
  {
    name: "Priya Sharma",
    photo: "/landing/reviews/tomas-kelvin.png",
    when: "12 days ago",
    stars: 5,
    text: "I was paying for Foreplay and AdSpy because neither one covered everything — Foreplay is Meta-only, AdSpy stops at Google. Rival pulls Meta, Google, TikTok, LinkedIn, Pinterest and Snapchat into one place, and the Activity Feed catches competitor moves I used to miss completely. The €79 pays for itself before lunch on Monday.",
  },
  {
    name: "James O'Brien",
    photo: "/landing/reviews/louis-byrd.png",
    when: "27 days ago",
    stars: 5,
    text: "The Stealable Angles feature rewired how I plan creative testing. I used to guess which angles to try next quarter — now I open the Comparison tab and see the exact angles a competitor is scaling that we're not running at all. We just prioritise those. Win rate on new creative is noticeably up since I made this a weekly habit.",
  },
  {
    name: "David Kowalski",
    photo: "/landing/reviews/malik-johnson.png",
    when: "52 days ago",
    stars: 5,
    text: "Took the 7-day trial on one competitor, signed up the same afternoon. Even on a single brand it surfaced three moves I'd missed despite checking their page every week — a new TikTok angle, a budget shift to Google, and a landing page I didn't know existed. If you're doing competitor research manually, you're missing more than you think you are.",
  },
  {
    name: "Sofia Ricci",
    photo: "/landing/reviews/lane-morris.png",
    when: "8 days ago",
    stars: 5,
    text: "I run competitor research for six clients across totally different industries. Rival is the only tool that actually scales with that — 15 competitors on Pro, all six platforms, no juggling four logins. The cross-platform view alone justifies it, but the per-competitor Strategy Map is what I screenshot into client decks.",
  },
  {
    name: "Tom Whitfield",
    photo: "/landing/reviews/triana-reyes.png",
    when: "5 days ago",
    stars: 1,
    text: "One star, and here's why. Before Rival I had a perfectly good excuse to spend Monday mornings \"doing competitor research\" — which mostly meant scrolling ad libraries with a coffee and looking busy until 11am. Now the Three Moves email is sitting in my inbox at 7am, fully done, and I have no choice but to actually start working. My quiet Monday is gone. Ruined a beloved routine. Devastating. (Campaigns are performing better though, so I can't even quit it.)",
  },
];

/** Mobile shows all reviews except the last three; desktop is unchanged. */
const reviewsMobile = reviews.slice(0, -3);

function ReviewStars({ count }: { count: Review["stars"] }) {
  return (
    <div className="flex gap-0.5 text-[13px] leading-none tracking-wider" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className={index < count ? "text-amber-400" : "text-gray-200/90"} aria-hidden>
          ★
        </span>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
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

      <div className="relative flex items-start gap-3.5">
        <div className="relative shrink-0">
          <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-white/90 to-[#4a7fa5]/20 opacity-80 blur-[1px]" />
          <div className="relative size-11 overflow-hidden rounded-full border border-white/80 bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_12px_-4px_rgba(74,127,165,0.25)] ring-1 ring-white/60">
            {review.photo ? (
              <Image
                src={review.photo}
                alt={`Photo of ${review.name}`}
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
          <p className="text-[15px] font-semibold leading-tight text-[#1a1a1a]">
            {review.name}
            <span className="font-normal text-gray-400"> · {review.when}</span>
          </p>
          <div className="mt-2">
            <ReviewStars count={review.stars} />
          </div>
        </div>
      </div>

      <p className="relative mt-4 flex-1 text-[13px] leading-[1.65] text-gray-600 sm:text-sm sm:leading-relaxed">
        {review.text}
      </p>
    </article>
  );
}

export function LandingReviews() {
  return (
    <section className="relative overflow-hidden py-16 text-center sm:py-24">
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
          className={`${landingNavAnchorScrollClasses} text-[clamp(2.5rem,11vw,3.75rem)] font-bold lowercase leading-[1.05] text-[#1a1a1a]`}
        >
          the preferred tool
          <br />
          <LandingHeadlineHighlight>of performance marketers.</LandingHeadlineHighlight>
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-5 text-left md:hidden">
          {reviewsMobile.map((review) => (
            <ReviewCard key={review.name} review={review} />
          ))}
        </div>

        <div className="mt-10 hidden grid-cols-1 gap-5 text-left sm:mt-16 sm:grid sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 md:grid">
          {reviews.map((review) => (
            <ReviewCard key={review.name} review={review} />
          ))}
        </div>
      </LandingScrollReveal>
    </section>
  );
}
