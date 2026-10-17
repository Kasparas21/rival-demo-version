/**
 * Text for the landing sections below the hero and for the /pricing page (16 Oct 2026 redesign,
 * modelled on holo's layout). Brand names in the visuals are made up; real ads only appear as
 * images in the ad wall. German and Dutch inherit this English copy until translated.
 */
type Row = { label: string; note: string };

export type LandingShowcaseCopy = {
  channels: {
    ads: { title: string; badge: string; caption: string };
    organic: { title: string; heading: string; days: string[]; labels: [string, string, string] };
    email: { title: string; heading: string; rows: Array<{ from: string; subject: string; time: string }>; promo: string };
    pages: { title: string; before: string; after: string; cta: string; change: string };
  };
  how: {
    title: string;
    titleMuted: string;
    intro: string;
    steps: {
      add: { title: string; placeholder: string };
      track: { title: string; rows: [Row, Row, Row, Row] };
      slack: { title: string; channel: string; time: string; app: string; message: string; source: string };
      chat: { title: string; connected: string; question: string; answer: string };
      copy: { title: string; prompt: string; theirs: string; live: string; yours: string; logo: string; tool: string };
    };
  };
  stats: Array<{ top: string; value: string; label: string }>;
  adsAria: string;
  proactive: {
    title: string;
    titleMuted: string;
    cta: string;
    cards: {
      launch: { tag: string; text: string; more: string };
      promo: { tag: string; text: string; rows: [string, string]; banner: string };
      shift: { tag: string; text: string; from: string; to: string };
      page: { tag: string; text: string; label: string; chip: string };
      angle: { tag: string; text: string; rows: Array<{ label: string; value: number }>; you: string };
      digest: { tag: string; text: string; heading: string; items: [string, string, string]; slack: string };
    };
  };
  /** Rival MCP + Higgsfield MCP in one Claude chat: their best ad, remade with your brand. */
  winner: {
    title: string;
    titleMuted: string;
    body: string;
    steps: [string, string, string];
    cta: string;
    note: string;
    chat: {
      assistant: string;
      connected: [string, string];
      ask: string;
      found: string;
      reply: string;
      days: [string, string, string];
      pick: string;
      making: string;
      done: string;
      theirs: string;
      yours: string;
      logo: string;
      cta: string;
      placeholder: string;
    };
  };
  compare: {
    title: string;
    titleMuted: string;
    without: string;
    with: string;
    vs: string;
    badge: string;
    cta: string;
    live: string;
    channel: string;
    minute: string;
    /** Paired rows: the same topic, how it goes without Rival and with it. */
    rows: Array<{ topic: string; without: string; with: string }>;
  };
  story: {
    words: string[];
    tails: [string, string, string, string];
    cards: Array<{ title: string; titleMuted: string; body: string; search: string }>;
    niches: string[];
    markets: Array<{ code: "us" | "gb" | "de" | "fr" | "es" | "lt" | "jp" | "br"; name: string }>;
    brands: Array<{ name: string; rivals: string }>;
    integrations: string[];
  };
  reviews: { title: string };
  getStarted: {
    title: string;
    placeholder: string;
    cta: string;
    tags: [string, string, string, string];
  };
  pricingPage: {
    steps: [string, string, string];
    title: string;
    sub: string;
    /** The three reassurances under the plan card. */
    trust: [string, string, string];
  };
  /** The /features overview and each /features/… and /adspy/… page. */
  detail: {
    features: string;
    adspy: string;
    allFeatures: string;
    previewLabel: string;
    moreFeatures: string;
    morePlatforms: string;
    overviewTitle: string;
    overviewTitleMuted: string;
    overviewSub: string;
    explore: string;
  };
};

export const showcaseEn: LandingShowcaseCopy = {
  channels: {
    ads: { title: "The ads they run", badge: "14 new ads this week", caption: "Meta, Google, TikTok and 3 more" },
    organic: {
      title: "What they post on social",
      heading: "Their week",
      days: ["Mon", "Tue", "Wed", "Thu"],
      labels: ["Reel", "Post", "Story"],
    },
    email: {
      title: "Their emails and promos",
      heading: "Inbox",
      rows: [
        { from: "Northwind", subject: "40% off ends tonight", time: "9:02" },
        { from: "Peak Gear", subject: "New drop: the summer edit", time: "Tue" },
        { from: "Glow Labs", subject: "You left something behind", time: "Mon" },
      ],
      promo: "Promo",
    },
    pages: { title: "Changes to their website", before: "Before", after: "Now", cta: "Shop now", change: "Button colour changed" },
  },
  how: {
    title: "How it works",
    titleMuted: "You set it up once.",
    intro:
      "Add a competitor and Rival keeps watching their ads, landing pages and emails. Each change goes to Slack, and when an ad of theirs works, you can remake it with your branding.",
    steps: {
      add: { title: "1. Add a competitor", placeholder: "yourrival.com" },
      track: {
        title: "2. Rival watches all of it",
        rows: [
          { label: "Ads", note: "All 6 platforms" },
          { label: "Landing pages", note: "Every change" },
          { label: "Emails", note: "Every send" },
          { label: "Organic posts", note: "Every post" },
        ],
      },
      slack: {
        title: "3. Changes show up in Slack",
        channel: "#rival-alerts",
        time: "now",
        app: "APP",
        message: "A competitor changed the button on their pricing page from blue to orange.",
        source: "Landing page · yourrival.com/pricing",
      },
      chat: {
        title: "4. Ask about them in Claude or ChatGPT",
        connected: "Rival connected",
        question: "What did my competitors launch this week?",
        answer: "6 new TikTok ads. 4 of them lead with a 30% off hook. Want the list?",
      },
      copy: {
        title: "5. Remake their best ad",
        prompt: "Make this with my logo and colours",
        theirs: "Their ad",
        live: "41 days live",
        yours: "Your version",
        logo: "Your logo",
        tool: "Rival + Higgsfield in Claude",
      },
    },
  },
  stats: [
    { top: "All", value: "6", label: "ad platforms in one feed" },
    { top: "Up to", value: "500", label: "ads per platform on day one" },
    { top: "Checking", value: "24/7", label: "while you get on with other work" },
    { top: "About", value: "5 min", label: "from typing a domain to seeing their ads" },
  ],
  adsAria: "Examples of competitor ads Rival collects",
  proactive: {
    title: "Rival spots it first",
    titleMuted: "and tells you what changed.",
    cta: "Try Rival",
    cards: {
      launch: {
        tag: "Launch",
        text: "A competitor launched 12 new Meta ads overnight. 8 share one hook.",
        more: "+12",
      },
      promo: {
        tag: "Promo",
        text: "A rival started a 30% sale on TikTok and email at the same time.",
        rows: ["TikTok ad", "Email"],
        banner: "30% OFF",
      },
      shift: { tag: "Shift", text: "A competitor moved budget from Meta to TikTok this week.", from: "Meta", to: "TikTok" },
      page: { tag: "Page change", text: "Their pricing page changed overnight.", label: "Pro plan", chip: "Price changed" },
      angle: {
        tag: "Angle",
        text: "Three rivals lead with free returns. Your ads don't mention it.",
        rows: [
          { label: "Free returns", value: 41 },
          { label: "Bundles", value: 22 },
          { label: "UGC reviews", value: 18 },
        ],
        you: "Not in your ads",
      },
      digest: {
        tag: "Slack",
        text: "Each change goes to your Slack channel as soon as Rival sees it.",
        heading: "#rival-alerts",
        items: ["New TikTok hook spotted", "30% off email sent", "Pricing page changed"],
        slack: "Sent to Slack",
      },
    },
  },
  winner: {
    title: "Copy their best ad",
    titleMuted: "with your branding, in about a minute.",
    body: "Connect Rival and Higgsfield to Claude. Ask Claude for your competitors' best ads, pick one, and Higgsfield makes the same photo with your logo and colours. You do it all in one chat.",
    steps: ["Ask Claude for your competitors' best ads", "Pick the one you like", "Higgsfield makes it with your brand"],
    cta: "Try Rival",
    note: "Example chat. Rival and Higgsfield both connect to Claude through MCP.",
    chat: {
      assistant: "Claude",
      connected: ["Rival MCP", "Higgsfield MCP"],
      ask: "Show me my competitors' best ads this month.",
      found: "Rival found 3 winners",
      reply: "These three have run the longest, so they're most likely working:",
      days: ["41 days", "33 days", "28 days"],
      pick: "Use #2. Make the same photo for my brand.",
      making: "Higgsfield is creating your image",
      done: "Same pose, light and layout, now with your logo and colours.",
      theirs: "Theirs",
      yours: "Yours",
      logo: "Your logo",
      cta: "Shop now",
      placeholder: "Ask Claude anything…",
    },
  },
  compare: {
    title: "Without Rival",
    titleMuted: "vs. with Rival",
    without: "Without Rival",
    with: "With Rival",
    vs: "vs",
    badge: "All Access",
    cta: "Get All Access",
    live: "Live 24/7",
    channel: "#competitors",
    minute: "1 min",
    rows: [
      { topic: "Their ads", without: "Six ad libraries, one tab at a time", with: "Every platform, one feed" },
      { topic: "Chat with the data", without: "Answers buried in screenshots", with: "Ask Claude or ChatGPT" },
      { topic: "Their landing pages", without: "Changes go unnoticed", with: "Every change caught" },
      { topic: "Their sales", without: "You find out after it ends", with: "Same-day Slack alert" },
      { topic: "Their best ad", without: "Brief a designer, wait days", with: "Remade for your brand" },
    ],
  },
  story: {
    words: ["Competitor", "spying", "on", "autopilot"],
    tails: ["for every brand", "in any niche", "in any market", "for any team"],
    cards: [
      {
        title: "Works in most niches,",
        titleMuted: "from skincare to SaaS.",
        body: "If your competitors advertise, Rival picks it up, whatever you sell.",
        search: "Skincare",
      },
      {
        title: "Track rivals abroad",
        titleMuted: "in their own language.",
        body: "Pick a country. Rival reads the ads in the local language and summarises them in yours.",
        search: "Deutschland",
      },
      {
        title: "Made for agencies too",
        titleMuted: "one login, many brands.",
        body: "Each brand you run gets its own list of rivals, and alerts go to Slack or email.",
        search: "Brands",
      },
    ],
    niches: ["Fashion & apparel", "Beauty", "Fitness", "SaaS", "Food & drink", "Travel", "Home", "Pets"],
    markets: [
      { code: "us", name: "United States" },
      { code: "gb", name: "United Kingdom" },
      { code: "de", name: "Deutschland" },
      { code: "fr", name: "France" },
      { code: "es", name: "España" },
      { code: "lt", name: "Lietuva" },
      { code: "jp", name: "日本" },
      { code: "br", name: "Brasil" },
    ],
    brands: [
      { name: "Northwind", rivals: "12 rivals" },
      { name: "Glow Labs", rivals: "8 rivals" },
      { name: "Peak Gear", rivals: "15 rivals" },
      { name: "Bloom & Co", rivals: "6 rivals" },
    ],
    integrations: ["Slack", "Email", "Claude", "ChatGPT", "Higgsfield"],
  },
  reviews: { title: "What marketers say about Rival" },
  getStarted: {
    title: "See what your competitors are running",
    placeholder: "Enter a competitor's website",
    cta: "Get started",
    tags: ["Meta", "TikTok", "Emails", "Landing pages"],
  },
  pricingPage: {
    steps: ["Plan", "Sign up", "Launch"],
    title: "Simple pricing",
    sub: "One plan with every channel and every feature. Add competitors only when you need them.",
    trust: ["Real human support", "Secure payments", "Cancel anytime"],
  },
  detail: {
    features: "Features",
    adspy: "AdSpy",
    allFeatures: "All features",
    previewLabel: "Live preview",
    moreFeatures: "More of what Rival does",
    morePlatforms: "The other platforms Rival covers",
    overviewTitle: "Everything Rival does",
    overviewTitleMuted: "is in one plan.",
    overviewSub: "Rival has ten tools for watching competitors, and the one plan includes all of them.",
    explore: "Explore",
  },
};
