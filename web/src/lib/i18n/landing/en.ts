import type { LandingCapabilityTile, LandingCopy } from "@/lib/i18n/landing/types";

const COMPARISON_SECTIONS: LandingCopy["comparison"]["sections"] = [
  {
    title: "Strategy OS",
    rows: [
      {
        feature: "Tracks a fixed list of named competitors as the core workflow",
        featureMobile: "Fixed competitor tracking list",
        rival: true,
        panoramata: true,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
      {
        feature: "Weekly email summaries focused on tracked competitors' changes",
        featureMobile: "Weekly competitor change emails",
        rival: true,
        panoramata: true,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
      {
        feature: "Generates recurring, per-competitor test ideas from their latest ads",
        featureMobile: "Auto test ideas from latest ads",
        rival: true,
        panoramata: false,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
    ],
  },
  {
    title: "Funnel & timeline intelligence",
    rows: [
      {
        feature: "Tags competitor ads by funnel stage (TOFU / MOFU / BOFU)",
        featureMobile: "Funnel stage tags (TOFU/MOFU/BOFU)",
        rival: true,
        panoramata: false,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
      {
        feature: "Shows a timeline of each competitor ad's lifespan (launch → killed)",
        featureMobile: "Ad lifespan timeline",
        rival: true,
        panoramata: false,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
      {
        feature: "Built-in archive of competitor landing pages, linked from every ad",
        featureMobile: "Landing page archive per ad",
        rival: true,
        panoramata: true,
        adspyder: true,
        poweradspy: true,
        adlibrary: true,
      },
    ],
  },
  {
    title: "Cross-platform competitor view",
    rows: [
      {
        feature:
          "Single dashboard showing each competitor's ads across Meta, Google, TikTok, LinkedIn, Pinterest",
        featureMobile: "All-platform ads in one dashboard",
        rival: true,
        panoramata: false,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
      {
        feature: "Competitor view is ad-funnel focused, not email / SMS / SEO-first",
        featureMobile: "Ad-funnel focus (not email/SEO)",
        rival: true,
        panoramata: false,
        adspyder: true,
        poweradspy: true,
        adlibrary: true,
      },
    ],
  },
  {
    title: "Beyond ad libraries",
    rows: [
      {
        feature: "Organic social monitoring - posts, hooks, and formats",
        featureMobile: "Organic social monitoring",
        rival: true,
        panoramata: false,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
      {
        feature: "Competitor email capture - promos, flows, and sequences",
        featureMobile: "Email flow capture",
        rival: true,
        panoramata: true,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
      {
        feature: "24/7 Autopilot alerts to Slack and email",
        featureMobile: "Autopilot Slack + email alerts",
        rival: true,
        panoramata: false,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
      {
        feature: "MCP access - query live competitor data from Claude and ChatGPT",
        featureMobile: "MCP for Claude & ChatGPT",
        rival: true,
        panoramata: false,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
    ],
  },
  {
    title: "Agency workflow",
    rows: [
      {
        feature: "Designed explicitly for media buyers & agencies (not just e-com brands)",
        featureMobile: "Built for agencies & media buyers",
        rival: true,
        panoramata: false,
        adspyder: true,
        poweradspy: true,
        adlibrary: true,
      },
      {
        feature: "Generates client-ready competitor reports with minimal manual editing",
        featureMobile: "Client-ready reports, minimal editing",
        rival: true,
        panoramata: true,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
    ],
  },
];

const LANDING_CAPABILITY_TILES: LandingCapabilityTile[] = [
  { key: "paid", label: "Paid ads" },
  { key: "organic", label: "Organic" },
  { key: "email", label: "Email" },
  { key: "autopilot", label: "Autopilot" },
  { key: "mcp", label: "MCP chat" },
];

/** Stack card: platforms row covers paid — intelligence tiles are the rest. */
const LANDING_INTELLIGENCE_CAPABILITY_TILES: LandingCapabilityTile[] = LANDING_CAPABILITY_TILES.filter(
  (tile) => tile.key !== "paid",
);

export const landingCopyEn: LandingCopy = {
  locale: "en",
  meta: {
    title: "Spy Rival - Competitor Spying on Autopilot | #1 Adspy Tool",
    description:
      "Rival runs your competitor spying on autopilot - the only tool that tracks paid ads, organic marketing, and email marketing 24/7, with MCP access from Claude & ChatGPT.",
  },
  header: {
    navItems: [
      { label: "How It Works", sectionId: "solution" },
      { label: "Pricing", sectionId: "pricing" },
      { label: "Compare", sectionId: "compare" },
      { label: "FAQ", sectionId: "faq" },
    ],
    startTrial: "TRY FOR FREE",
    homeAria: "Rival home",
    primaryNavAria: "Primary",
    localeSwitcherAria: "Choose language",
  },
  hero: {
    headline: {
      line1Prefix: "competitor spying ",
      highlight: "on autopilot",
      line2: "",
      subline:
        "Track competitor ads, organic social, and email in one platform - ad libraries, strategy maps, and alerts when something changes.",
      sublineMobile:
        "Competitor ads, organic, and email - ad libraries, strategy maps, and alerts in one platform.",
    },
    trialCta: "TRY FOR FREE",
    platformTrialAria: "Start your trial with {platform}",
    marketersPillAria: "Built for performance marketers",
    marketersPill: "Built for performance marketers",
    brandMarqueeAria: "Trusted by performance marketers",
    brandMarqueeLabel: "Trusted by performance marketers",
    coverage: {
      chips: [
        { key: "paid", label: "Paid ads" },
        { key: "organic", label: "Organic" },
        { key: "email", label: "Email" },
        { key: "autopilot", label: "Autopilot" },
        {
          key: "mcp",
          label: "MCP",
          href: "/docs/mcp",
          linkAriaLabel: "Learn how to connect Rival to Claude and ChatGPT over MCP",
        },
      ],
    },
  },
  howItWorks: {
    titleLine1: "from domain to",
    titleHighlight: "autopilot",
    titleSuffix: "in 5 minutes",
    steps: [
      {
        title: "Drop a competitor domain",
        body: "Paste their URL. No ad library tabs, no spreadsheets, no setup call.",
      },
      {
        title: "Rival scans every channel",
        body: "Paid ads, organic posts, and emails pull in automatically across six platforms.",
      },
      {
        title: "Autopilot watches 24/7",
        body: "Slack and email alerts when rivals launch ads, posts, or promos - no manual checking.",
      },
    ],
    cta: "TRY FOR FREE",
  },
  autopilot: {
    titleLine1: "your new",
    titleHighlight: "24/7 spying employee",
    subtitle:
      "Turn it on once. Autopilot watches every competitor around the clock - scanning their ads, organic posts, and inboxes - then pings you in Slack and email.",
    stats: [
      { value: "24/7", label: "Always on watch", sub: "every competitor, every channel" },
      { value: "~1h", label: "Catches new launches", sub: "flagged while fresh, not weeks later" },
      { value: "Slack", label: "Instant alerts", sub: "email digests too" },
    ],
    feed: {
      title: "Night shift report",
      liveLabel: "LIVE",
      items: [
        {
          time: "02:14",
          tag: "ad",
          tagLabel: "AD",
          text: "SmileCo launched 4 new Meta ads - new discount angle detected",
        },
        {
          time: "03:47",
          tag: "email",
          tagLabel: "EMAIL",
          text: "Winback flow captured: 20% offer, 3-email sequence",
        },
        {
          time: "05:22",
          tag: "organic",
          tagLabel: "ORGANIC",
          text: "New TikTok hook format - reposted 3rd time this week",
        },
        {
          time: "06:38",
          tag: "page",
          tagLabel: "PAGE",
          text: "Landing page changed - new pricing table archived",
        },
        {
          time: "07:00",
          tag: "report",
          tagLabel: "REPORT",
          text: "Autopilot alert sent to Slack - new Meta launch detected",
        },
      ],
      footer: "…all while you were sleeping",
      brief: {
        title: "Your overnight Autopilot digest",
        highlights: [
          "SmileCo launched 4 Meta ads with a new 0% financing angle",
          "BrightDental started a 4-email winback flow with a 20% offer",
          "NovaSmile reposted a proven TikTok hook for the third time this week",
        ],
        cta: "Open Autopilot in Rival",
      },
    },
    cta: "PUT YOUR SPYING ON AUTOPILOT",
  },
  coverage: {
    titleLine1: "spy on their",
    titleHighlight: "entire marketing",
    subtitle:
      "Every channel they ship on - plus the intelligence layer that tells you what's working, what's testing, and what they killed.",
    groups: [
      {
        label: "Every channel they use",
        cards: [
          {
            key: "paid",
            title: "Paid ads",
            tagline: "Every active ad, 6 platforms.",
          },
          {
            key: "organic",
            title: "Organic social",
            tagline: "Their posts, hooks & formats.",
          },
          {
            key: "email",
            title: "Email marketing",
            tagline: "Every promo, flow & sequence.",
          },
        ],
      },
      {
        label: "Connect all that data with Rival features like",
        cards: [
          {
            key: "strategy-map",
            title: "Strategy Map",
            tagline: "Platform x funnel view of their whole playbook.",
          },
          {
            key: "landing-tests",
            title: "Landing page tests",
            tagline: "See A/B variants and which page is winning.",
          },
          {
            key: "winners",
            title: "Winners & losers",
            tagline: "Proven ads vs creatives they killed fast.",
          },
        ],
      },
    ],
    cta: "Explore every feature",
  },
  mcp: {
    titleLine1: "chat with your",
    titleHighlight: "spy data",
    subtitle:
      "Rival plugs straight into Claude and ChatGPT over MCP. Ask about your competitors in plain English - your AI answers with live data from your Rival workspace.",
    chat: {
      connectedLabel: "Claude - connected to Rival",
      userMsg: "What did my competitors launch this week?",
      replyIntro: "3 notable Autopilot alerts from your tracked rivals:",
      replyBullets: [
        "SmileCo launched 6 Meta ads pushing a new “0% financing” angle",
        "BrightDental started a 4-email winback flow with a 20% offer",
        "NovaSmile turned its best TikTok hook into a paid ad - proven winner",
      ],
      replyOutro: "Want me to draft counter-angles for the financing push?",
      inputPlaceholder: "Ask anything about your competitors…",
    },
    worksWith: "Works with",
    clients: ["Claude", "ChatGPT", "Cursor", "Claude Code"],
    cta: "SET UP IN 2 MINUTES",
  },
  features: {
    titleLine1: "from competitor ads to",
    titleHighlight: "autopilot alerts 24/7",
    subtitle:
      "Paid ads, organic, email, Autopilot alerts, and MCP - one login replaces six tools.",
    capabilitiesLabel: "The full stack in one plan",
    capabilities: LANDING_CAPABILITY_TILES,
    cards: [
      {
        imageAlt:
          "Ad Library dashboard showing ads from multiple platforms with Meta, Google, TikTok, LinkedIn, Pinterest, and Snapchat selectors and platform badges on ad tiles.",
        title: "Every platform they advertise on - in one view.",
        body: "Six ad platforms. One competitor domain. No more tab chaos.",
      },
      {
        imageAlt:
          "Strategy Map showing a competitor's platform-by-funnel grid with activity tags and an AI strategy summary.",
        title: "See their whole strategy on one map.",
        body: "Platform-by-funnel view plus organic, email, and landing-page archive.",
      },
      {
        imageAlt:
          "Autopilot Slack channel with overnight competitor alerts for ads, email, and organic posts.",
        title: "Autopilot watches while you sleep.",
        body: "Slack and email alerts the moment rivals launch, pivot, or promo.",
      },
    ],
    cta: "Explore every feature",
  },
  stackReplacement: {
    titlePrefix: "six tools, or ",
    titleHighlight: "one",
    titleSuffix: "",
    vs: "vs",
    withoutTitle: "Without Rival",
    withoutBadge: "The old way",
    withoutIntro: "Six separate tools. Zero shared view.",
    withoutIntroMobile: "Six tools. Zero shared view.",
    withoutStatTools: "tools",
    withoutStatLogins: "logins",
    withoutStatGlue: "glue/wk",
    toolsSummary: "{count} tools · {count} logins · zero intelligence",
    toolsSummaryMobile: "{count} tools · {count} logins",
    manualLabel: "The weekly grind",
    manualLabelMobile: "Weekly grind",
    painPoints: ["Spreadsheet glue", "Tab switching", "Monday guesswork"],
    painPointsMobile: ["Spreadsheets", "Tab chaos", "Guesswork"],
    payTodayLabel: "Stack cost today",
    payTodayAmount: "$350",
    payTodaySub: "/mo · ~4 hrs glue / week",
    payTodayBullets: [],
    payTodayFooter: "$270+/mo more than Rival",
    payTodayFooterSub: "6 logins · no strategy map",
    bottomBadge: "6 tools · zero payoff",
    withTitle: "With Rival",
    platformsLabel: "6 ad platforms",
    platformsLabelMobile: "6 platforms",
    capabilitiesLabel: "Plus the intelligence layer",
    capabilities: LANDING_INTELLIGENCE_CAPABILITY_TILES,
    onePlanLabel: "One plan · full stack",
    price: "$40",
    priceSuffix: "/mo",
    zeroGlue: "Zero glue work · one login",
    saveLabel: "Save $270+/mo vs a 6-tool stack",
    saveSub: "7-day trial · 1 competitor · cancel anytime",
    saveSubMobile: "Save $270+/mo · 7-day trial",
    trialCta: "TRY FOR FREE",
    stackTools: [
      { name: "AdLibrary.com", iconKey: "search", iconClass: "text-[#2563eb]", iconBg: "bg-[#dbeafe]" },
      { name: "SpyFu / Semrush", iconKey: "userSearch", iconClass: "text-[#1a1a1a]", iconBg: "bg-[#f3f4f6]" },
      { name: "PiPiAds", iconKey: "play", iconClass: "text-[#7c3aed]", iconBg: "bg-[#ede9fe]" },
      { name: "Foreplay", iconKey: "layers", iconClass: "text-[#1a1a1a]", iconBg: "bg-[#f3f4f6]" },
      { name: "5 native ad libraries", iconKey: "folder", iconClass: "text-[#ca8a04]", iconBg: "bg-[#fef9c3]" },
      { name: "Spreadsheets & decks", iconKey: "spreadsheet", iconClass: "text-[#16a34a]", iconBg: "bg-[#dcfce7]" },
    ],
    platforms: ["Meta", "Google", "TikTok", "LinkedIn", "Snapchat", "Pinterest"],
  },
  reviews: {
    title: "Trusted by those who move fast.",
    subtitle: "Performance marketers scaling with Rival",
    photoAlt: "Photo of {name}",
    featureImageAlt: "Photo from {name}'s review",
    socialProof: {
      count: "400+",
      label: "marketers love Rival",
      trustpilotAria: "Rated 5 out of 5 on Trustpilot",
    },
    items: [
      {
        name: "Marcus Chen",
        photo: "/landing/reviews/steven-guajardo.webp",
        meta: "US · Jan 2026",
        verified: true,
        cardSize: "tall",
        featureImage: "/landing/reviews/usage/usage-1.webp",
        featureImageAlt: "Autopilot settings with Slack and email delivery turned on",
        text: "Flipped Autopilot on once - Slack and email wired up in under five minutes. Automatic watch stays armed while I sleep; clients get proof when competitors move, not vague advice. Hours back every week.",
      },
      {
        name: "James O'Brien",
        photo: "/landing/reviews/louis-byrd.webp",
        meta: "IE · Dec 2025",
        verified: true,
        featureImage: "/landing/reviews/usage/usage-2.webp",
        featureImageAlt: "Ad Library dashboard with live ads across Meta, Google, and Snapchat",
        text: "Pulled Adidas into the Ad Library - 73 live ads across six platforms in one view. Stealable Angles showed hooks we're not testing.",
      },
      {
        name: "Sofia Ricci",
        photo: "/landing/reviews/lane-morris.webp",
        meta: "IT · Jan 2026",
        cardSize: "tallest",
        featureImage: "/landing/reviews/usage/usage-3.webp",
        featureImageAlt: "Full-funnel Strategy Map with paid, organic, and email channels",
        text: "Fifteen competitors, six clients, one login. Exported the full Strategy Map into a client deck - every channel and funnel stage on one slide. The playbook finally makes sense to non-marketers.",
      },
      {
        name: "Sarah Mitchell",
        photo: "/landing/reviews/malik-johnson.webp",
        meta: "AU · Nov 2025",
        peek: true,
        text: "Signed up after a one-competitor trial the same day. Found moves I'd missed for weeks.",
      },
    ],
  },
  pricing: {
    titleLine1: "choose your",
    titleHighlight: "plan",
    riskFreeBadge: "Risk-free",
    guaranteeTitle: "7-day free trial, then 30-day money-back",
    guaranteeBody:
      "Start with a full-product 7-day trial (card required). If Rival hasn't shown you something worth acting on within your first 30 days, email us for a full refund - no questions asked.",
    billingAria: "Billing period",
    monthly: "Monthly",
    yearly: "Yearly",
    planIncludes: "Plan includes:",
    footnote: "try it for free · cancel anytime",
    trialCta: "TRY FOR FREE",
    popularBadge: "Most popular",
    popularClaim: "Trusted by 400+ buyers",
    perMonth: "/month",
    perCompetitor: "{price} / competitor",
    billedMonthly: "Billed monthly",
    billedAnnually: "Billed annually (${yearlyUsd}/year)",
    plans: [
      {
        slug: "starter",
        name: "Starter",
        summary: "For solo media buyers tracking their core market rivals.",
        monthlyUsd: 40,
        annualMonthlyUsd: 32,
        annualYearlyUsd: 384,
        metricHighlight: { count: "5", label: "competitors tracked" },
        features: [
          "Paid, organic & email intelligence",
          "Autopilot alerts to Slack + email",
          "MCP access from Claude & ChatGPT",
          "6 ad platforms · one dashboard",
          "Strategy Map + Autopilot 24/7",
          "1 workspace · up to 15 swaps/month",
        ],
      },
      {
        slug: "pro",
        name: "Pro",
        summary: "For teams that need more competitors, exports, and on-demand refresh.",
        monthlyUsd: 60,
        originalMonthlyUsd: 75,
        annualMonthlyUsd: 48,
        annualYearlyUsd: 576,
        metricHighlight: { count: "15", label: "competitors tracked" },
        plusLabel: "Everything in Starter, plus",
        popular: true,
        features: [
          "1 brand workspace · up to 50 swaps/month",
          "Priority refresh",
          "CSV exports (ads + emails)",
          "Manual refresh on demand",
          "Historical snapshots",
          "Emerging Angle Alerts",
        ],
      },
      {
        slug: "agency",
        name: "Agency",
        summary: "For agencies managing multiple client brands in one account.",
        monthlyUsd: 100,
        annualMonthlyUsd: 80,
        annualYearlyUsd: 960,
        metricHighlight: { count: "75", label: "competitor slots" },
        plusLabel: "Everything in Pro, plus",
        features: [
          "Up to 5 brand workspaces - separate competitor lists per client",
          "All Pro features on every brand",
          "CSV exports · manual refresh · alert rules",
          "Dedicated onboarding for your team",
          "Priority support + white-label client reports",
        ],
      },
    ],
  },
  faq: {
    titleLine1: "frequently asked",
    titleHighlight: "questions",
    items: [
      {
        q: "How does the free trial work?",
        a: "Sign up with your card and get 7 days of full Rival access tracking 1 competitor across all 6 platforms. Cancel anytime in the first 7 days and you won't be charged. If you continue, you're billed from $40/month on Starter ($384/year - 20% off - if you choose annual). One-click cancel, no retention calls.",
      },
      {
        q: "How is Rival different from Foreplay or AdSpy?",
        a: "Foreplay and AdSpy are ad libraries - they show you what a competitor runs. Rival is an intelligence platform - it shows you what they run and alerts you when it matters. Three concrete differences: (1) Rival covers all 6 major ad platforms out of the box - Foreplay is Meta-only, AdSpy stops at Meta and Google. (2) The Stealable Angles feature compares a competitor's angles against your own library to find specific gaps you can fill - nobody else does this. (3) Autopilot watches 24/7 and sends Slack and email alerts when rivals launch, pivot, or promo - not a static dashboard you check manually.",
      },
      {
        q: "Is this legal?",
        a: "Yes. Rival only pulls data from the publicly available ad transparency libraries that Meta, Google, TikTok, LinkedIn, Pinterest, and Snapchat publish themselves. No private data, no account access, nothing that isn't already public.",
      },
      {
        q: "How often does data update?",
        a: "Every tracked competitor refreshes automatically on a rolling schedule - fast-moving platforms like Meta and Google update every few days, others on a slightly longer cadence - so there's always fresh data waiting when you log in. Pro users can also trigger a manual refresh on demand. Most users open Rival on Monday morning to see everything that changed over the past week.",
      },
      {
        q: "Can I track my own brand too?",
        a: "Yes, and we recommend it. Adding your own brand unlocks side-by-side stats, head-to-head comparisons, and the Stealable Angles feature, which compares competitor angles against your own library to surface the specific gaps you should be testing.",
      },
      {
        q: "What platforms does Rival work with?",
        a: "Meta (Facebook and Instagram), Google (Search, Display, YouTube), TikTok, LinkedIn, Pinterest, and Snapchat. All six are included in every plan - no per-platform upcharges.",
      },
      {
        q: "How accurate is the data?",
        a: "Ad detection is highly reliable across supported platforms because we read directly from each platform's official transparency library. Strategic analysis - funnel classification, angle clustering, audience inference - is AI-generated and gets sharper as a competitor's data volume grows. Every analytical claim is tied back to the underlying ads, so you can always verify it against the source evidence yourself.",
      },
      {
        q: "Can I cancel anytime?",
        a: 'Yes. One click in your account settings - no retention calls, no "are you sure" prompts. If you cancel mid-cycle, you keep full access until the period ends.',
      },
    ],
  },
  comparison: {
    titleLine1: "how we compare",
    titleHighlight: "to other tools",
    subtitle: "Rival vs Panoramata, AdSpyder, PowerAdSpy, and AdLibrary.com - at a glance.",
    featureColumn: "Feature",
    yesAria: "Yes",
    noAria: "No",
    cta: "TRY FOR FREE",
    ctaFootnote: "The only cross-platform competitor OS with Autopilot built in.",
    sections: COMPARISON_SECTIONS,
    competitorColumns: [
      { key: "panoramata", label: "Panoramata", short: "Pano", mobile: "Pan" },
      { key: "adspyder", label: "AdSpyder", short: "AdSpy", mobile: "Spy" },
      { key: "poweradspy", label: "PowerAdSpy", short: "Power", mobile: "Pow" },
      { key: "adlibrary", label: "AdLibrary.com", short: "AdLib", mobile: "Lib" },
    ],
  },
  finalCta: {
    titleLine1: "see what your",
    titleHighlight: "competitors run",
    subtitle: "free 7-day trial.",
    monthlyPrice: "$40/mo",
    annualPrice: "$32/mo",
    monthlyLabel: "Monthly",
    annualLabel: "Annual",
    annualSaveBadge: "Save 20%",
    billingAria: "Choose billing period",
    trialCta: "TRY FOR FREE",
    cancelNote: "cancel anytime",
  },
  footer: {
    columns: [
      {
        title: "PRODUCT",
        links: [
          { label: "How It Works", href: "/#how-it-works" },
          { label: "Compare", href: "/#compare" },
          { label: "Pricing", href: "/#pricing" },
          { label: "FAQ", href: "/#faq" },
          { label: "Start trial", href: "/onboarding" },
        ],
      },
      {
        title: "RESOURCES",
        links: [
          { label: "Blog", href: "/blog" },
          { label: "About", href: "/about" },
          { label: "Contact", href: "mailto:hello@spy-rival.com" },
        ],
      },
      {
        title: "LEGAL",
        links: [
          { label: "Privacy Policy", href: "/privacy" },
          { label: "Terms of Service", href: "/terms" },
          { label: "Cookie Policy", href: "/cookies" },
        ],
      },
    ],
    copyright: "© 2026 Spy-Rival",
  },
  jsonLd: {
    appDescription:
      "Competitor spying on autopilot - tracks paid ads, organic marketing, and email marketing across Meta, Google, TikTok, LinkedIn, Pinterest, and Snapchat, with MCP access from Claude and ChatGPT.",
    starterName: "Starter",
    proName: "Pro",
    agencyName: "Agency",
  },
};

export const landingFaqItemsEn = landingCopyEn.faq.items;
