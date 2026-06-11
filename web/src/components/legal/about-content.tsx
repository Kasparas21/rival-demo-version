import type { ReactNode } from "react";
import Link from "next/link";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10 scroll-mt-28">
      <h2 className="mb-4 text-2xl font-bold tracking-tight text-[#1a1a1a]">{title}</h2>
      <div className="space-y-4 text-[15px] leading-relaxed text-[#333]">{children}</div>
    </section>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function AboutContent() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-[#1a1a1a] sm:text-4xl">About Rival</h1>
      <p className="mt-3 text-lg font-medium text-[#4a7fa5]">We got tired of guessing what our competitors were doing.</p>
      <p className="mt-2 text-base text-[#333]">Rival was built by performance marketers, for performance marketers.</p>

      <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-[#333]">
        <P>
          Before Rival, keeping tabs on competitors meant the same exhausting ritual every week: open the Meta Ad
          Library, then the Google Transparency Center, then TikTok, then LinkedIn, then screenshot a few ads into a
          folder no one ever looked at again. Six platforms, six tabs, zero clarity. By the time you&apos;d pieced
          together what a competitor was actually doing, they&apos;d already moved on.
        </P>
        <P>
          So we built the tool we wished existed — one place that watches every platform your competitors advertise on,
          decodes their strategy automatically, and tells you what to do about it before Monday&apos;s standup.
        </P>
      </div>

      <Section title="What Rival does">
        <P>
          Rival is the only competitor ad intelligence tool that tracks all six major platforms — Meta, Google, TikTok,
          LinkedIn, Pinterest, and Snapchat — in a single dashboard.
        </P>
        <P>
          You add a competitor by domain. Within minutes, Rival pulls their entire active ad library across every
          platform they run on, then uses AI to decode the strategy behind it: which angles they&apos;re scaling, where
          they&apos;re shifting budget, what funnel stages they&apos;re targeting, and exactly what you should test next.
          Every Monday, you get a personalized digest of what each competitor did that week — no scrolling, no guessing,
          no manual research.
        </P>
        <P>
          It&apos;s not a swipe file. It&apos;s not a search engine. It&apos;s a competitive intelligence system that
          runs on autopilot and reports to you every week.
        </P>
      </Section>

      <Section title="Why we're different">
        <P>
          Every other tool in this space watches one platform and calls it competitive research. Foreplay shows you Meta.
          AdSpy stops at Google. But your competitors don&apos;t advertise on one platform — and neither should your
          intelligence.
        </P>
        <P>
          We believe knowing what a competitor runs isn&apos;t enough. The tools that show you a wall of ads leave you
          to figure out what it all means. Rival closes that gap: it tells you what changed, why it matters, and the
          three concrete moves to make this week — each one grounded in your competitor&apos;s actual ad data, not
          generic best practice.
        </P>
      </Section>

      <Section title="Who we are">
        <P>
          Rival is built and run by a small, independent team that lives inside ad accounts every day. We&apos;re not a
          venture-funded growth machine with a hundred salespeople — we&apos;re operators who got frustrated enough with
          the status quo to build the alternative. That means every feature exists because we needed it ourselves, every
          decision is made by people who actually use the product, and there&apos;s no sales call standing between you
          and trying it.
        </P>
        <P>
          We&apos;re based in the European Union and we take your data and privacy seriously — your information is never
          sold, and the only ads we touch are the ones platforms already make public. Read our{" "}
          <Link href="/privacy" className="text-[#4a7fa5] hover:underline">
            Privacy Policy
          </Link>
          .
        </P>
      </Section>

      <section className="mt-12 rounded-2xl border border-[#4a7fa5]/20 bg-white px-6 py-8 text-center shadow-sm">
        <h2 className="text-xl font-bold text-[#1a1a1a]">Start watching your competitors the smart way</h2>
        <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-[#333]">
          See exactly what your competitors are advertising — everywhere they advertise — and turn it into a weekly
          action plan. Try Rival free for 7 days.
        </p>
        <Link
          href="/checkout"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-[#1a1a1a] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#333]"
        >
          TRY FOR FREE
        </Link>
      </section>
    </>
  );
}
