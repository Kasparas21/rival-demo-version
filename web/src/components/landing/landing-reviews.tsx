import Image from "next/image";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";

const reviews = [
  {
    name: "Steven Guajardo",
    photo: "/landing/reviews/steven-guajardo.png",
    when: "1 day ago",
    text: "Spy Rival has drastically cut down my agency's tool spend. Previously I was paying for 5 different ad spy subscriptions to get half the features Spy Rival offers. Now I get a complete package: strategy maps, AI insights, real-time alerts, and cross-platform research at a fraction of the cost. The ROI is incredible.",
  },
  {
    name: "Tomas Kelvin",
    photo: "/landing/reviews/tomas-kelvin.png",
    when: "12 days ago",
    text: "Rightly recommended by everyone in my marketing community. Spy Rival was introduced to me by a peer and it's easy to see why. I can make decisions that increase client revenue because of the accuracy and depth of the cross-platform data. Game changer.",
  },
  {
    name: "Louis Byrd",
    photo: "/landing/reviews/louis-byrd.png",
    when: "27 days ago",
    text: "Before I started using Spy Rival, I was lost in a sea of competitor research tools, trying to find one platform that would make everything click. Spy Rival did exactly that. The strategy map insights have given me clarity into the competition like never before. Now I not only know what they're running but also why.",
  },
  {
    name: "Malik Johnson",
    photo: "/landing/reviews/malik-johnson.png",
    when: "52 days ago",
    text: "I'm not one to leave reviews online, but I believe Spy Rival deserves it completely. A fellow agency owner recommended it for finding gaps in client competitor strategies. I must admit, I was sceptical. But after the free trial, I was hooked. After two months, I doubled my agency's research output.",
  },
  {
    name: "Lane Morris",
    photo: "/landing/reviews/lane-morris.png",
    when: "8 days ago",
    text: "When it comes to customer support, Spy Rival sets the gold standard. Their team goes out of their way to not just resolve issues but to educate me on how to make the most out of the tool. It's not just a service: it's a partnership.",
  },
  {
    name: "Triana Reyes",
    photo: "/landing/reviews/triana-reyes.png",
    when: "38 days ago",
    text: "I've been using ad intelligence tools for years and Spy Rival is the gem I just discovered. Probably the best product I know for cross-platform competitor research. Thank you to the team for building something this thoughtful and useful.",
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
