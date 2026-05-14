import Image from "next/image";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";

const reviews = [
  {
    name: "Marcus Chen",
    photo: "/landing/reviews/steven-guajardo.png",
    when: "1 day ago",
    text: "Rival replaced four separate subscriptions for my agency. The Three Moves feature alone saves me hours per client every month. Instead of sending vague 'do more video' recommendations, I'm now showing clients specific competitor ads to copy with exact reasoning. Game changed this year.",
  },
  {
    name: "Priya Sharma",
    photo: "/landing/reviews/tomas-kelvin.png",
    when: "12 days ago",
    text: "I was paying for Foreplay AND AdSpy because neither covered everything I needed. Rival covers Meta, Google, TikTok, and the others in one tool — and the weekly Activity Feed catches competitor moves I'd have missed manually. The €79 pays for itself in time saved on Mondays.",
  },
  {
    name: "James O'Brien",
    photo: "/landing/reviews/louis-byrd.png",
    when: "27 days ago",
    text: "The Stealable Angles feature changed how I plan our creative testing. Instead of guessing which angles to try next quarter, I see exactly what's working for competitors and prioritize testing those. Our creative win rate jumped after I started using this weekly.",
  },
  {
    name: "David Kowalski",
    photo: "/landing/reviews/malik-johnson.png",
    when: "52 days ago",
    text: "Took a free trial last month and signed up the same day. The Activity Feed showed me three competitor moves I'd completely missed despite checking their pages weekly. If you're managing competitor research manually, you're missing more than you realize.",
  },
  {
    name: "Sofia Ricci",
    photo: "/landing/reviews/lane-morris.png",
    when: "8 days ago",
    text: "I run competitor research for 6 clients across different industries. Rival is the only tool that scales with that — I can track 25 brands across all platforms without juggling subscriptions. The cross-platform view alone makes this worth it.",
  },
  {
    name: "Aisha Patel",
    photo: "/landing/reviews/triana-reyes.png",
    when: "38 days ago",
    text: "Most competitor tools are search engines — you have to know what you're looking for. Rival is the first one that just tells you what matters this week. Open it Monday, get three moves, brief the team, done. It became part of our weekly ritual within a month.",
  },
];

export function LandingReviews() {
  return (
    <section className="overflow-hidden py-16 text-center sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <h2 id="reviews" className={`${landingNavAnchorScrollClasses} text-[clamp(2.5rem,11vw,3.75rem)] font-bold leading-[1.05] text-[#1a1a1a]`}>
          The preferred tool
          <br />
          <span className="text-[#4a7fa5]">of performance marketers.</span>
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-5 text-left sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <article key={r.name} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-100">
                  <Image
                    src={r.photo}
                    alt={`Photo of ${r.name}`}
                    width={80}
                    height={80}
                    className="size-full object-cover"
                    sizes="40px"
                  />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-base font-semibold text-[#1a1a1a]">{r.name}</p>
                  <p className="text-xs text-gray-400">{r.when}</p>
                </div>
              </div>
              <div className="mt-2 text-sm text-yellow-400" aria-hidden>
                ★★★★★
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-700">{r.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
