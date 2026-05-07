import { RivalLogoImg } from "@/components/rival-logo";

const categories = ["All", "Product", "Business"];

const posts = [
  {
    title: "Higgsfield AI vs Rival: Which Platform Delivers Better ROAS?",
    date: "Mar 16, 2026",
    tag: "Business",
    excerpt:
      "The arms race in generative AI is accelerating. Discover the core differences between Higgsfield AI and Rival, and learn why transitioning from organic content creation to...",
    hero: true,
  },
  {
    title: "Creatify AI vs Rival: The Best AI Ad Generator Revealed",
    date: "Mar 15, 2026",
    tag: "Business",
    excerpt:
      "While Creatify AI offers quick URL-to-video tools for beginners, Rival provides a complete...",
  },
  {
    title: "Arcads vs Rival: The Ultimate Showdown for AI Generated Ads",
    date: "Mar 14, 2026",
    tag: "Business",
    excerpt:
      "The future of paid acquisition relies on AI generated ads. Discover the showdown between...",
  },
  {
    title: "How to Decode Winning Concepts Before Your Competitors Do",
    date: "Mar 13, 2026",
    tag: "Business",
    excerpt:
      "Transition from throwing spaghetti at the wall to becoming an advertising scientist. Discover how...",
  },
  {
    title: "The Return of the Image: Why Static Ads Are Beating Video in 2026",
    date: "Mar 12, 2026",
    tag: "Business",
    excerpt:
      "Think video is the only way to win? Think again. In 2026, static ads are outperforming high...",
  },
  {
    title: "Programmatic Advertising is a Scam (Unless You Use AI)",
    date: "Mar 11, 2026",
    tag: "Business",
    excerpt:
      "Traditional programmatic advertising is broken, with up to 50% of your budget lost to middlemen...",
  },
  {
    title: "Your Instagram Marketing Strategy is Broken (Here's How to Fix It)",
    date: "Mar 10, 2026",
    tag: "Business",
    excerpt:
      "Likes don't pay the rent. Discover why organic reach is dead and how the most successful...",
  },
];

const footerLinks = [
  {
    title: "Product",
    items: ["Solution", "Pricing", "How It Works", "Reviews", "Login"],
  },
  {
    title: "Company",
    items: ["About", "Blog", "Contact"],
  },
  {
    title: "Legal",
    items: ["Privacy Policy", "Terms of Service", "Cookie Policy"],
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#f3f1f4] text-gray-800">
      <header className="fixed top-0 left-0 right-0 z-20 px-6 pt-6">
        <div className="mx-auto max-w-[1100px] rounded-[42px] bg-white shadow-lg shadow-black/5">
          <div className="flex min-h-[52px] items-center justify-between gap-4 px-6 py-2.5 sm:min-h-[56px] sm:px-8 sm:py-3">
            <a href="/" className="shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-gray-400/40">
              <RivalLogoImg className="block h-[26px] w-auto max-w-[160px] object-contain object-left object-bottom sm:h-[30px]" />
            </a>
            <nav className="hidden items-center md:flex">
              <div className="flex items-center gap-5 text-[13px] leading-none sm:gap-6 sm:text-sm">
                {(
                  [
                    ["Solution", true],
                    ["How It Works", false],
                    ["Blog", false],
                    ["FAQ", false],
                    ["Reviews", false],
                  ] as const
                ).map(([item, primary]) => (
                  <a
                    key={item}
                    className={`transition-colors hover:text-gray-900 ${
                      primary
                        ? "font-semibold text-gray-800"
                        : "font-medium text-gray-600"
                    }`}
                    href="#"
                  >
                    {item}
                  </a>
                ))}
              </div>
              <span
                className="mx-3 hidden h-4 w-px shrink-0 bg-gray-300/70 sm:mx-4 md:block"
                aria-hidden
              />
              <a
                href="#"
                className="shrink-0 rounded-full bg-gray-900 px-4 py-2 text-[13px] font-semibold leading-none text-white shadow-sm transition-colors hover:bg-gray-800 sm:text-sm"
              >
                Login
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 pb-24 pt-32">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-full bg-white px-2 py-1 shadow-sm">
            {categories.map((cat, index) => (
              <button
                key={cat}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  index === 0
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs text-gray-500 shadow-sm">
            <span>🔍</span>
            Search
          </div>
        </div>

        <section className="mt-8 grid gap-8">
          {posts
            .filter((post) => post.hero)
            .map((post) => (
              <article
                key={post.title}
                className="grid gap-6 overflow-hidden rounded-[22px] bg-white shadow-md md:grid-cols-[1.2fr_1fr]"
              >
                <div className="relative min-h-[260px] bg-gradient-to-br from-[#1b1c30] via-[#243a6d] to-[#5c3f8e]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(109,213,255,0.4),rgba(0,0,0,0))]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,178,99,0.35),rgba(0,0,0,0))]" />
                  <div className="absolute inset-0 flex items-center justify-center text-4xl font-black text-white opacity-80">
                    ⚡
                  </div>
                </div>
                <div className="flex flex-col justify-center gap-3 px-6 py-8">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-500">
                    {post.tag}
                    <span className="ml-2 text-gray-400">{post.date}</span>
                  </div>
                  <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                    {post.title}
                  </h1>
                  <p className="text-sm text-gray-600">{post.excerpt}</p>
                  <a className="text-sm font-semibold text-gray-900" href="#">
                    Read Article →
                  </a>
                </div>
              </article>
            ))}
        </section>

        <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts
            .filter((post) => !post.hero)
            .map((post, index) => (
              <article
                key={post.title}
                className="overflow-hidden rounded-[20px] bg-white shadow-md"
              >
                <div
                  className={`h-[160px] bg-gradient-to-br ${
                    index % 3 === 0
                      ? "from-[#1d1f33] via-[#2d4b7a] to-[#5e4b8b]"
                      : index % 3 === 1
                      ? "from-[#2f3b55] via-[#2e4f7c] to-[#5c66c2]"
                      : "from-[#4b2f2a] via-[#563434] to-[#6b4b4b]"
                  }`}
                />
                <div className="px-5 py-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-500">
                    {post.tag}
                    <span className="ml-2 text-gray-400">{post.date}</span>
                  </div>
                  <h2 className="mt-2 text-base font-semibold text-gray-900">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-xs text-gray-600">{post.excerpt}</p>
                  <a className="mt-4 inline-block text-xs font-semibold text-gray-900" href="#">
                    Read →
                  </a>
                </div>
              </article>
            ))}
        </section>

        <div className="mt-12 flex items-center justify-center gap-2 text-xs text-gray-500">
          <button className="rounded-full border border-gray-200 px-3 py-1">Previous</button>
          <button className="rounded-full bg-gray-900 px-3 py-1 text-white">1</button>
          <button className="rounded-full border border-gray-200 px-3 py-1">2</button>
          <span>...</span>
          <button className="rounded-full border border-gray-200 px-3 py-1">11</button>
          <button className="rounded-full border border-gray-200 px-3 py-1">Next</button>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white/60 py-12">
        <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-10 px-6 md:grid-cols-[1.4fr_2fr]">
          <div>
            <RivalLogoImg className="h-7 w-auto max-w-[160px] object-contain object-left" />
            <p className="mt-3 text-sm text-gray-500">
              AI-powered Facebook ads management that runs your entire ad
              strategy on autopilot.
            </p>
            <div className="mt-4 flex gap-3 text-lg text-gray-400">
              <span>◎</span>
              <span>◉</span>
              <span>◇</span>
              <span>▷</span>
              <span>♬</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {footerLinks.map((group) => (
              <div key={group.title}>
                <p className="text-sm font-semibold text-gray-900">{group.title}</p>
                <ul className="mt-3 space-y-2 text-sm text-gray-500">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-[1100px] border-t border-gray-200 px-6 pt-6 text-xs text-gray-400">
          © 2026 Rival. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
