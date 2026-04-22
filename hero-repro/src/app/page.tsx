"use client";

import { useEffect, useRef, useState } from "react";
import SearchComponent from "../components/ui/animated-glowing-search-bar";
import { Globe, DollarSign, Zap, Target, Search, Settings, Crown, Sparkles, Eye, TrendingDown, Hourglass, Ban, X, Check, Map, Layers, EyeOff, Users, Clock, Compass, ArrowRight } from "lucide-react";
import { Timeline } from "@/components/ui/timeline";
import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1";
import { motion } from "motion/react";
import { RivalLogoImg } from "@/components/rival-logo";
import Link from "next/link";

const chips = [
  { label: "Works in any language", icon: <Globe className="w-5 h-5 text-gray-700" /> },
  { label: "Supports any currency", icon: <DollarSign className="w-5 h-5 text-gray-700" /> },
  { label: "24/7 AI optimization", icon: <Zap className="w-5 h-5 text-gray-700" /> },
];

const avatars = [
  "/marketer.png",
  "/marketer.png",
  "/marketer.png",
  "/marketer.png",
];

const carouselCards = [
  {
    title: "Generate personalized",
    subtitle: "In 2 Weeks, Say Goodbye To:",
    metricLeft: "2M",
    metricMid: "124",
    metricRight: "23%",
    badge: "July, 2025",
    image: "/images/ads/ad-1.png",
  },
  {
    title: "Generate personalized",
    subtitle: "KARM",
    metricLeft: "6M",
    metricMid: "93",
    metricRight: "14%",
    badge: "July, 2025",
    image: "/images/ads/ad-2.png",
  },
  {
    title: "Generate personalized",
    subtitle: "Get things done",
    metricLeft: "1M",
    metricMid: "93",
    metricRight: "23%",
    badge: "Aug, 2025",
    image: "/images/ads/ad-3.png",
  },
  {
    title: "Generate personalized",
    subtitle: "What our customers say?",
    metricLeft: "110K",
    metricMid: "2",
    metricRight: "76%",
    badge: "Oct, 2025",
    image: "/images/ads/ad-4.png",
  },
  {
    title: "Generate personalized",
    subtitle: "Classic Root Beer",
    metricLeft: "3.5M",
    metricMid: "45",
    metricRight: "67%",
    badge: "Sep, 2025",
    image: "/images/ads/ad-5.png",
  },
];

const timeline = [
  {
    step: "01",
    title: "Search competitor ads",
    body: "Enter any competitor to see their active ads across all platforms.",
  },
  {
    step: "02",
    title: "AI labeling & mapping",
    body: "Our AI reads the language and CTA to classify ads as cold, warm, or hot.",
  },
  {
    step: "03",
    title: "Get your visual funnel",
    body: "We stitch it all together into a visual map with insights on gaps.",
  },
];

const personas = [
  {
    title: "Founders",
    desc: "Scale without guessing competitors' funnels",
    image: "/founder.png",
    bg: "bg-[#dff1ff]",
  },
  {
    title: "Marketers",
    desc: "Map entire customer journeys in seconds",
    image: "/marketer.png",
    bg: "bg-[#e6e6e6]",
  },
  {
    title: "Designers",
    desc: "See exact creatives used at each stage",
    image: "/designer.png",
    bg: "bg-[#ffd9d9]",
  },
  {
    title: "Agencies",
    desc: "Deliver full funnel breakdowns to clients",
    image: "/agency.png",
    bg: "bg-[#f6e9c8]",
  },
];

const faqData = [
  {
    question: "Do I need to be a marketing expert to use Rival?",
    answer:
      "Not at all. Rival is designed to be intuitive. Enter a competitor's domain, and our AI does the heavy lifting—analyzing their ads and mapping their entire funnel strategy.",
  },
  {
    question: "Is this legal?",
    answer:
      "Yes, 100%. We only collect publicly available data from ad libraries. We use AI to classify and organize it to give you actionable insights on their customer journey.",
  },
  {
    question: "Will it show me their exact ad spend?",
    answer:
      "Ad platforms do not publicly disclose exact spend amounts. However, we analyze metrics and platform distribution to estimate where they are investing the most.",
  },
  {
    question: "I already have a marketing team. Can they use this?",
    answer:
      "Absolutely! Rival is a massive time-saver. Instead of spending days manually guessing retargeting gaps, your team can start with a visual map of the competitor's strategy.",
  },
  {
    question: "Does Rival work for any niche?",
    answer:
      "Yes. From e-commerce and SaaS to local businesses and B2B, as long as your competitors are running ads, Rival can map their funnel.",
  },
  {
    question: "What if it doesn't work for me?",
    answer:
      "We offer a 30-day money-back guarantee. If you don't see measurably better insights and results than doing it manually, we will refund your subscription—no questions asked.",
  },
];

export default function Home() {
  const carouselWrapRef = useRef<HTMLDivElement | null>(null);
  const carouselTrackRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        const wrap = carouselWrapRef.current;
        const track = carouselTrackRef.current;
        if (!wrap || !track) return;

        const rect = wrap.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const scrollTop = window.scrollY;
        const start = scrollTop + Math.max(0, rect.top - viewportHeight);
        const end = start + rect.height + viewportHeight * 5.5;
        const progress = Math.min(
          1,
          Math.max(0, (scrollTop - start) / (end - start)),
        );
        const maxShift = Math.max(0, track.scrollWidth - wrap.clientWidth);
        const translateX = -maxShift * progress;
        track.style.transform = `translate3d(${translateX}px, 0, 0)`;
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-32 top-24 h-[520px] w-[520px] rounded-full blur-[140px]"
          style={{ background: "transparent", opacity: 0 }}
        />
        <div
          className="absolute right-[-140px] top-40 h-[520px] w-[520px] rounded-full blur-[140px]"
          style={{ background: "transparent", opacity: 0 }}
        />
        <div
          className="absolute left-[35%] top-[20%] h-[380px] w-[380px] rounded-full"
          style={{ background: "transparent", opacity: 0 }}
        />
      </div>

      <header className="fixed top-0 left-0 right-0 z-50 pt-6 px-4 flex justify-center pointer-events-none">
        <nav className="pointer-events-auto w-full max-w-[860px] rounded-[44px] bg-white/40 backdrop-blur-md shadow-sm border border-white/60">
          <div className="flex min-h-[52px] items-center justify-between gap-4 px-5 py-2.5 sm:min-h-[56px] sm:gap-6 sm:px-10 sm:py-3">
            <a
              href="/"
              className="flex shrink-0 items-center rounded-lg outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-gray-400/40"
              style={{ textDecoration: "none" }}
            >
              {/* Pin wordmark to bottom of box so it lines up with nav text; object-contain + centered Y was reading top-heavy */}
              <RivalLogoImg className="block h-[26px] w-auto max-w-[min(200px,42vw)] object-contain object-left object-bottom sm:h-[30px]" />
            </a>
            <nav className="hidden items-center md:flex">
              <div className="flex items-center gap-5 lg:gap-6">
                <a
                  href="#solution"
                  className="text-[13px] font-semibold leading-none text-gray-800 transition-colors duration-200 hover:text-gray-950 sm:text-sm"
                >
                  Solution
                </a>
                <a
                  href="#how-it-works"
                  className="text-[13px] font-medium leading-none text-gray-600 transition-colors duration-200 hover:text-gray-900 sm:text-sm"
                >
                  How It Works
                </a>
                <a
                  href="https://rival.ai/blog"
                  className="text-[13px] font-medium leading-none text-gray-600 transition-colors duration-200 hover:text-gray-900 sm:text-sm"
                >
                  Blog
                </a>
                <a
                  href="#faq"
                  className="text-[13px] font-medium leading-none text-gray-600 transition-colors duration-200 hover:text-gray-900 sm:text-sm"
                >
                  FAQ
                </a>
                <a
                  href="#testimonials"
                  className="text-[13px] font-medium leading-none text-gray-600 transition-colors duration-200 hover:text-gray-900 sm:text-sm"
                >
                  Reviews
                </a>
                <a
                  href="/affiliate"
                  className="text-[13px] font-medium leading-none text-gray-600 transition-colors duration-200 hover:text-gray-900 sm:text-sm"
                >
                  Affiliates
                </a>
              </div>
              <span
                className="mx-3 hidden h-4 w-px shrink-0 bg-gray-300/70 sm:mx-4 md:block"
                aria-hidden
              />
              <Link
                href="/dashboard/spy"
                className="shrink-0 rounded-full bg-gray-900 px-4 py-2 text-[13px] font-semibold leading-none text-white shadow-sm transition-colors duration-200 hover:bg-gray-800 sm:text-sm"
              >
                Go to Demo
              </Link>
            </nav>
            <button
              className="flex shrink-0 items-center justify-center rounded-lg p-2 transition-colors duration-200 hover:bg-gray-200/50 md:hidden"
              aria-label="Open menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-menu h-5 w-5 text-gray-700"
                aria-hidden="true"
              >
                <path d="M4 12h16" />
                <path d="M4 18h16" />
                <path d="M4 6h16" />
              </svg>
            </button>
          </div>
        </nav>
      </header>

      <section
        id="hero"
        className="relative pt-28 sm:pt-36 md:pt-44 lg:pt-52"
        style={{ overflow: "hidden" }}
      >
        {/* Video background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source
            src="/smooth_animation_for_202603181849.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
          <div className="absolute left-[-10%] top-[-10%] h-[600px] w-[600px] rounded-full bg-[#E9F1B5]/30 blur-[130px]" />
          <div className="absolute right-[-10%] top-[0%] h-[700px] w-[700px] rounded-full bg-[#F3E3FF]/40 blur-[150px]" />
          <div className="absolute left-[20%] bottom-[0%] h-[500px] w-[500px] rounded-full bg-[#DDF1FD]/30 blur-[120px]" />
          <div className="absolute right-[10%] bottom-[-10%] h-[400px] w-[400px] rounded-full bg-[#fffcf0]/30 blur-[100px]" />
        </div>
        {/* Soft bottom fade to seamlessly blend the hero video into the page body */}
        <div className="absolute bottom-0 left-0 right-0 h-[220px] sm:h-[240px] bg-gradient-to-t from-[#e6f7ff] to-transparent z-[1] pointer-events-none" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-[2]">
          <div className="text-center max-w-5xl mx-auto">
            <div className="flex flex-col items-center sm:relative sm:inline-block">
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-[64px] font-normal leading-[1.05] text-[#343434] tracking-tight text-center">
                <span className="block">Every ad your competitors run.</span>
                <span className="block">Every platform. Instantly.</span>
              </h1>
            </div>
            <p className="mx-auto mt-10 sm:mt-12 max-w-3xl px-2 font-medium leading-relaxed text-[#808080] sm:px-0 text-base sm:text-lg opacity-90 text-center">
              Our AI tracks every ad your competitors run across all platforms. Discover exactly what messaging works, spot the gaps in their strategy.
            </p>
            <div className="mx-auto mt-12 sm:mt-16 flex flex-col items-center justify-center w-full max-w-2xl">
              <SearchComponent />
              <div className="mt-16 sm:mt-20 inline-flex items-center gap-3 rounded-full border border-white/60 bg-white/40 backdrop-blur-md shadow-sm px-5 py-2.5 hover:bg-white/50 transition-colors cursor-pointer">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <span className="text-xs font-semibold text-gray-800 tracking-wide uppercase sm:text-[13px] whitespace-nowrap">
                  Joined by 4,268 smart advertisers
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          ref={carouselWrapRef}
          style={{
            marginTop: "32px",
            paddingTop: "0px",
            paddingBottom: "12px",
            width: "100%",
            overflowX: "auto",
            overflowY: "visible",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div
            ref={carouselTrackRef}
            style={{
              display: "flex",
              gap: "16px",
              width: "max-content",
              padding: "0 0 0 0",
            }}
          >
            {[
              {
                src: "/images/ads/ad-1.png",
                reach: "1.1M",
                days: "93",
                impr: "98%",
                date: "July, 2025",
              },
              {
                src: "/images/ads/ad-2.png",
                reach: "2M",
                days: "124",
                impr: "23%",
                date: "July, 2025",
              },
              {
                src: "/images/ads/ad-3.png",
                reach: "6M",
                days: "93",
                impr: "14%",
                date: "July, 2025",
              },
              {
                src: "/images/ads/ad-4.png",
                reach: "1M",
                days: "93",
                impr: "23%",
                date: "July, 2025",
              },
              {
                src: "/images/ads/ad-5.png",
                reach: "110K",
                days: "2",
                impr: "76%",
                date: "Oct, 2025",
              },
              {
                src: "/images/ads/ad-6.png",
                reach: "3.5M",
                days: "45",
                impr: "67%",
                date: "Aug, 2025",
              },
              {
                src: "/images/ads/ad-7.png",
                reach: "850K",
                days: "30",
                impr: "89%",
                date: "Sep, 2025",
              },
              {
                src: "/images/ads/ad-8.png",
                reach: "2.2M",
                days: "15",
                impr: "92%",
                date: "Oct, 2025",
              },
              {
                src: "/images/ads/ad-9.png",
                reach: "1.8M",
                days: "60",
                impr: "45%",
                date: "Nov, 2025",
              },
              {
                src: "/images/ads/ad-10.png",
                reach: "4.1M",
                days: "28",
                impr: "81%",
                date: "Dec, 2025",
              },
            ].map((card) => (
              <div
                key={card.src}
                className="shrink-0 w-[320px] sm:w-[340px] rounded-2xl overflow-hidden bg-white/40 backdrop-blur-lg border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]"
              >
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "1 / 1",
                    margin: "12px",
                    borderRadius: "12px",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={card.src}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      left: "10px",
                      right: "10px",
                    }}
                  >
                    <a
                      href="/pricing"
                      style={{
                        display: "block",
                        textAlign: "center",
                        background: "rgba(255,255,255,0.92)",
                        backdropFilter: "blur(4px)",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#555",
                        textDecoration: "none",
                      }}
                    >
                      Your competitor
                    </a>
                  </div>
                </div>
                <div style={{ padding: "14px 16px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      marginBottom: "12px",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "#897f7f" }}>
                      Active since
                    </span>
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "#B4D67E",
                        display: "inline-block",
                      }}
                    ></span>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#343434",
                      }}
                    >
                      {card.date}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "8px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          marginBottom: "4px",
                        }}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          style={{ color: "rgb(137, 127, 127)" }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </div>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: 600,
                          color: "rgb(52, 52, 52)",
                        }}
                      >
                        {card.reach}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "rgb(137, 127, 127)",
                        }}
                      >
                        Reach
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          marginBottom: "4px",
                        }}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          style={{ color: "rgb(137, 127, 127)" }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: 600,
                          color: "rgb(52, 52, 52)",
                        }}
                      >
                        {card.days}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "rgb(137, 127, 127)",
                        }}
                      >
                        Days
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          marginBottom: "4px",
                        }}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          style={{ color: "rgb(137, 127, 127)" }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                          />
                        </svg>
                      </div>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: 600,
                          color: "rgb(52, 52, 52)",
                        }}
                      >
                        {card.impr}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "rgb(137, 127, 127)",
                        }}
                      >
                        Impr.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="autopilot"
        className="relative pb-32 pt-24 overflow-hidden"
        style={{ background: "linear-gradient(165deg, #e6f7ff 0%, #f0faff 40%, #fffde6 80%, #fffcef 100%)" }}
      >
        {/* Soft decorative blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[-10%] top-[10%] h-[600px] w-[600px] rounded-full bg-[#FFF4CB]/30 blur-[150px]" />
          <div className="absolute right-[-10%] top-[0%] h-[700px] w-[700px] rounded-full bg-[#DDF1FD]/40 blur-[160px]" />
          <div className="absolute left-[30%] bottom-[0%] h-[400px] w-[400px] rounded-full bg-[#FFF4CB]/30 blur-[140px]" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16 md:mt-20 relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-12">
            <h2 className="font-serif text-3xl font-normal tracking-tight text-[#343434] sm:text-4xl md:text-5xl mb-4">
              See how Rival maps your competitors&apos;{" "}
              <em>funnel</em>
            </h2>
            <p className="max-w-3xl mx-auto text-base text-[#808080] sm:text-lg font-medium">
              Watch Rival AI analyze competitors across all platforms, decode their messaging, and generate actionable insights
            </p>
          </div>
        </div>
        {/* Floating Demo App */}
        <div
          className="relative w-full max-w-[1240px] mx-auto mt-8 sm:mt-10 md:mt-14 mb-12 px-4 md:px-6"
          style={{ perspective: "1000px" }}
        >
          <div className="relative bg-white/60 backdrop-blur-xl rounded-[28px] shadow-[0_60px_140px_-20px_rgba(0,0,0,0.25)] ring-1 ring-black/5 overflow-hidden transition-all duration-500 hover:-translate-y-2">
            {/* Browser chrome */}
            <div className="h-11 bg-white/80 backdrop-blur-sm flex items-center justify-between px-5 border-b border-black/5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]"></div>
                <div className="w-3 h-3 rounded-full bg-[#FEBC2E]"></div>
                <div className="w-3 h-3 rounded-full bg-[#28C840]"></div>
              </div>
              <div className="flex items-center gap-2 bg-black/5 rounded-lg px-4 py-1.5 min-w-[200px] sm:min-w-[280px] justify-center">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-[13px] text-gray-500 font-medium">rival.ai/dashboard</span>
              </div>
              <div className="text-xs text-gray-400 font-medium">My Workspace</div>
            </div>

            {/* App body */}
            <div className="flex h-[520px] sm:h-[620px] md:h-[700px] overflow-hidden bg-[#f8f9fb]/60">
              {/* Left sidebar */}
              <div className="w-[60px] sm:w-[220px] border-r border-black/5 bg-white/70 flex flex-col py-6 px-3 sm:px-4 gap-3 flex-shrink-0 backdrop-blur-md">
                <div className="hidden sm:block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 pl-2">Menu</div>
                <button className="flex items-center justify-center sm:justify-start gap-3 w-full bg-gradient-to-r from-[#DDF1FD]/50 to-transparent text-gray-800 font-bold px-3 py-2.5 rounded-xl transition-colors border border-[#DDF1FD] shadow-sm">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span className="hidden sm:inline text-sm">PROJECT</span>
                </button>
                <button className="flex items-center justify-center sm:justify-start gap-3 w-full hover:bg-black/5 text-gray-600 font-medium px-3 py-2.5 rounded-xl transition-colors">
                  <Search className="w-5 h-5 text-gray-400" />
                  <span className="hidden sm:inline text-sm whitespace-nowrap">Find competitor</span>
                </button>
                <div className="border-b border-black/5 w-full my-2"></div>
                <div className="mt-auto">
                  <button className="flex items-center justify-center sm:justify-start gap-3 w-full hover:bg-black/5 text-gray-500 font-medium px-3 py-2.5 rounded-xl transition-colors">
                    <Settings className="w-5 h-5 opacity-70" />
                    <span className="hidden sm:inline text-sm">Settings</span>
                  </button>
                </div>
              </div>

              {/* Main content */}
              <div className="flex-1 flex flex-col overflow-hidden bg-white/30">
                {/* Top Header */}
                <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6 border-b border-black/5 flex-shrink-0 bg-white/50 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 flex items-center justify-center text-xl text-yellow-500">
                        <Crown className="w-6 h-6" />
                      </div>
                      <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">competitor.com</h1>
                        <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                          <span className="text-[11px] sm:text-xs font-medium text-green-600">Tracking Active</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <button className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#DDF1FD] to-[#DDF1FD]/70 text-blue-900 font-bold shadow-sm ring-1 ring-blue-200 text-[13px] sm:text-sm transition-all shadow-[0_2px_10px_0_rgba(221,241,253,0.5)]">
                      ads library
                    </button>
                    <button className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-white/60 hover:bg-white text-gray-600 font-medium ring-1 ring-black/5 text-[13px] sm:text-sm transition-all shadow-sm">
                      strategy overview
                    </button>
                    <button className="hidden sm:block px-5 py-2.5 rounded-xl bg-white/60 hover:bg-white text-gray-600 font-medium ring-1 ring-black/5 text-sm transition-all shadow-sm">
                      comparison to you
                    </button>
                    <button className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#FFF4CB]/80 to-[#FFF4CB]/50 text-[#8B7500] font-semibold ring-1 ring-[#FFE5B4] hover:shadow-md text-[13px] sm:text-sm transition-all shadow-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> AI insight
                    </button>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center justify-between gap-4 mt-5 sm:mt-6">
                    <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                      <div className="flex items-center bg-white/80 p-1 rounded-xl ring-1 ring-black/5 shadow-sm">
                        <button className="px-3 sm:px-4 py-1.5 rounded-lg bg-[#343434] text-white text-[11px] sm:text-xs font-bold shadow-sm">
                          active
                        </button>
                        <button className="px-3 sm:px-4 py-1.5 rounded-lg text-gray-500 hover:text-gray-800 text-[11px] sm:text-xs font-medium transition-colors">
                          all ads
                        </button>
                      </div>
                      
                      <div className="relative flex-1 sm:w-[240px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-400 text-xs">🔍</span>
                        </div>
                        <input type="text" placeholder="" className="w-full pl-9 pr-4 py-1.5 sm:py-2 bg-white/80 border border-black/5 rounded-xl text-[13px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#DDF1FD] text-gray-700 shadow-sm placeholder-gray-400" />
                      </div>
                    </div>
                    
                    <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/80 border border-black/5 rounded-xl text-xs font-medium text-gray-600 hover:bg-white shadow-sm transition-colors ml-auto">
                      sort by <span className="opacity-60 text-[10px]">▼</span>
                    </button>
                  </div>
                </div>

                {/* Columns Area */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 pb-2">
                  <div className="flex gap-4 sm:gap-6 h-full min-w-max pb-4 px-1">
                    
                    {/* Column 1: Meta */}
                    <div className="w-[280px] sm:w-[320px] flex flex-col bg-white/50 ring-1 ring-black/5 rounded-[20px] p-2 pb-0 shadow-sm backdrop-blur-sm">
                      <div className="px-4 py-3 flex justify-between items-center bg-white/60 rounded-xl mb-3 border border-black/5 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-sm font-bold text-sm">f</div>
                          <div>
                            <div className="font-bold text-gray-800 text-[13px] sm:text-sm">Meta ads</div>
                            <div className="text-[11px] text-gray-500 font-medium tracking-wide">47 active ads</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto px-1 sm:px-2 pb-6 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="w-full aspect-video bg-gradient-to-br from-blue-50/50 to-gray-100 p-2 sm:p-3 flex flex-col items-center justify-center">
                              <div className="w-[80%] h-[60%] bg-white/40 rounded-lg ring-1 ring-black/5 shadow-sm backdrop-blur-sm"></div>
                            </div>
                            <div className="p-4 sm:p-5">
                              <p className="font-bold text-gray-800 text-[13px] sm:text-sm leading-snug mb-1.5 line-clamp-1">Headline</p>
                              <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed line-clamp-2">ad text describing the strategy or the hook used in this creative mapping.</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Column 2: Google */}
                    <div className="w-[280px] sm:w-[320px] flex flex-col bg-white/50 ring-1 ring-black/5 rounded-[20px] p-2 pb-0 shadow-sm backdrop-blur-sm">
                      <div className="px-4 py-3 flex justify-between items-center bg-white/60 rounded-xl mb-3 border border-black/5 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-[10px] bg-white ring-1 ring-gray-200 flex items-center justify-center shadow-sm text-lg font-bold">G</div>
                          <div>
                            <div className="font-bold text-gray-800 text-[13px] sm:text-sm">Google ads</div>
                            <div className="text-[11px] text-gray-500 font-medium tracking-wide">47 active ads</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto px-1 sm:px-2 pb-6 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden group hover:shadow-md transition-shadow">
                             <div className="w-full aspect-video bg-gradient-to-br from-green-50/30 to-gray-100 p-2 sm:p-3 flex flex-col items-center justify-center">
                               <div className="w-[80%] h-[60%] bg-white/40 rounded-lg ring-1 ring-black/5 shadow-sm backdrop-blur-sm"></div>
                            </div>
                            <div className="p-4 sm:p-5">
                              <p className="font-bold text-gray-800 text-[13px] sm:text-sm leading-snug mb-1.5 line-clamp-1">Headline</p>
                              <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed line-clamp-2">ad text showing the exact keywords or search intent captured.</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Column 3: Youtube */}
                    <div className="w-[280px] sm:w-[320px] flex flex-col bg-white/50 ring-1 ring-black/5 rounded-[20px] p-2 pb-0 shadow-sm backdrop-blur-sm pr-4 sm:pr-2">
                      <div className="px-4 py-3 flex justify-between items-center bg-white/60 rounded-xl mb-3 border border-black/5 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white shadow-sm text-sm font-black">▶</div>
                          <div>
                            <div className="font-bold text-gray-800 text-[13px] sm:text-sm">Youtube ads</div>
                            <div className="text-[11px] text-gray-500 font-medium tracking-wide">47 active ads</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto px-1 sm:px-2 pb-6 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {[1, 2].map((i) => (
                          <div key={i} className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden group hover:shadow-md transition-shadow">
                             <div className="w-full aspect-video bg-gradient-to-br from-red-50/30 to-gray-100 p-2 sm:p-3 flex flex-col items-center justify-center">
                               <div className="w-[80%] h-[60%] bg-white/40 rounded-lg ring-1 ring-black/5 shadow-sm backdrop-blur-sm"></div>
                            </div>
                            <div className="p-4 sm:p-5">
                              <p className="font-bold text-gray-800 text-[13px] sm:text-sm leading-snug mb-1.5 line-clamp-1">Headline</p>
                              <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed line-clamp-2">ad text providing video hook analysis and call to action.</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-24 sm:mt-32 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-5xl mx-auto">
            <div className="text-center transition-transform hover:-translate-y-1 duration-300">
              <h3 className="text-[#343434] font-black text-3xl sm:text-4xl md:text-[40px] leading-tight">
                1M+
              </h3>
              <p className="text-[#898989] font-medium text-xs sm:text-sm mt-1 sm:mt-2 uppercase tracking-wide">
                Ads Labeled
              </p>
            </div>
            <div className="text-center transition-transform hover:-translate-y-1 duration-300">
              <h3 className="text-[#343434] font-black text-3xl sm:text-4xl md:text-[40px] leading-tight">
                500+
              </h3>
              <p className="text-[#898989] font-medium text-xs sm:text-sm mt-1 sm:mt-2 uppercase tracking-wide">
                Funnels Mapped
              </p>
            </div>
            <div className="text-center transition-transform hover:-translate-y-1 duration-300">
              <h3 className="text-[#343434] font-black text-3xl sm:text-4xl md:text-[40px] leading-tight">
                10K+
              </h3>
              <p className="text-[#898989] font-medium text-xs sm:text-sm mt-1 sm:mt-2 uppercase tracking-wide">
                Strategic Gaps Found
              </p>
            </div>
          </div>
        </div>

        {/* Problem Section */}
        <div className="relative pb-20 mt-16 sm:mt-24">
          <div className="mx-auto flex max-w-[920px] flex-col items-center px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/80 bg-white/60 backdrop-blur-md px-4 py-1.5 mb-8">
              <span className="text-[11px] font-semibold text-gray-400 tracking-[0.18em] uppercase">The Problem</span>
            </div>
            <h2 className="max-w-[44rem] font-serif text-[2.2rem] sm:text-[2.8rem] font-normal tracking-tight text-[#343434] leading-[1.15]">
              Scale your ads without the{" "}
              <em>guesswork</em>. Stop flying blind on their strategy.
            </h2>

            <div className="mt-12 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  title: "Tunnel Vision",
                  body: "You see isolated ads but have no idea how they connect into a larger funnel.",
                },
                {
                  title: "Audience Mismatch",
                  body: "You can't tell if an ad targets cold audiences or ready-to-buy customers.",
                },
                {
                  title: "Wasted Time",
                  body: "You spend days guessing their retargeting strategy and funnel gaps.",
                },
                {
                  title: "Guesswork Strategy",
                  body: "Your strategy is built on vibes — not a full view of their journey.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex flex-row items-start gap-3 p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-white/90 shadow-[0_1px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 transition-all duration-200 text-left"
                >
                  <span className="mt-[5px] shrink-0 w-1.5 h-1.5 rounded-full bg-[#a8c4d4] inline-block"></span>
                  <div>
                    <h3 className="text-[14px] font-semibold text-[#1a1a1a] mb-0.5 leading-tight">{item.title}</h3>
                    <p className="text-[13px] text-[#777] leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- Solution Section merged into Autopilot Flow --- */}
        <div className="relative pb-24 mt-24">
          <div className="mx-auto flex max-w-[1300px] flex-col items-center px-6 text-center relative z-20">

          <div
            className="relative mx-auto max-w-6xl rounded-[40px] px-8 pt-16 pb-24 sm:px-12 sm:pt-20 sm:pb-32 lg:px-16 z-20 border border-gray-100 shadow-[0_4px_60px_rgba(0,0,0,0.03)]"
            style={{ backgroundColor: "#FFFFFF" }}
          >
            <div className="mb-16 text-center relative max-w-2xl mx-auto flex flex-col items-center">
              
              {/* Clean, icon-less Solution Tag inside the card */}
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50/80 px-5 py-2 mb-8 transition-all hover:bg-gray-100 relative z-30">
                <span className="text-[11px] sm:text-[13px] font-bold text-gray-500 tracking-[0.15em] uppercase">
                  The Solution
                </span>
              </div>

              {/* $99/mo Popup positioned near the title */}
              <div className="absolute -top-4 -right-4 sm:-right-8 sm:-top-4 -rotate-6 transform hover:rotate-0 transition-transform duration-300 z-10 hidden sm:block pointer-events-none">
                <div className="relative">
                  <svg width="100" height="90" viewBox="0 0 142 101" fill="none" className="drop-shadow-md">
                    <path d="M138.815 37.3683C137.481 29.8009 133.831 23.2872 128.867 18.681C123.799 13.9645 120.342 7.41682 119.079 0.255811L115.494 0.887914L6.79496 20.0545C8.05763 27.2155 7.02075 34.5557 3.89881 40.7163C0.810254 46.7423 -0.392123 54.1116 0.942208 61.679C2.27654 69.2464 5.92687 75.7601 10.8902 80.3663C15.9582 85.0827 19.4157 91.6304 20.6784 98.7914L24.2632 98.1593L132.935 78.9977C131.672 71.8367 132.709 64.4964 135.831 58.3359C138.914 52.2789 140.122 44.9404 138.788 37.3731L138.815 37.3683Z" fill="#FFF4CB" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center -rotate-6">
                    <span className="font-extrabold text-2xl text-[#8B7500] leading-none">$99</span>
                    <span className="font-bold text-[10px] text-[#A68A00] uppercase tracking-wider mt-0.5">/ month</span>
                  </div>
                </div>
              </div>

              <h2 className="mb-5 text-center font-serif text-4xl sm:text-5xl font-normal leading-tight text-[#343434]">
                See their exact playbook.
              </h2>
              <p className="text-center font-sans text-xl sm:text-2xl font-medium leading-relaxed text-[#888]">
                Rival tracks and maps their entire funnel for you:
              </p>
              
              {/* Mobile popup version */}
              <div className="sm:hidden mt-6 inline-block -rotate-3 transform pointer-events-none">
                <div className="relative">
                  <svg width="90" height="70" viewBox="0 0 142 101" fill="none" className="drop-shadow-md">
                    <path d="M138.815 37.3683C137.481 29.8009 133.831 23.2872 128.867 18.681C123.799 13.9645 120.342 7.41682 119.079 0.255811L115.494 0.887914L6.79496 20.0545C8.05763 27.2155 7.02075 34.5557 3.89881 40.7163C0.810254 46.7423 -0.392123 54.1116 0.942208 61.679C2.27654 69.2464 5.92687 75.7601 10.8902 80.3663C15.9582 85.0827 19.4157 91.6304 20.6784 98.7914L24.2632 98.1593L132.935 78.9977C131.672 71.8367 132.709 64.4964 135.831 58.3359C138.914 52.2789 140.122 44.9404 138.788 37.3731L138.815 37.3683Z" fill="#FFF4CB" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center -rotate-6">
                    <span className="font-extrabold text-xl text-[#8B7500] leading-none">$99</span>
                    <span className="font-bold text-[9px] text-[#A68A00] uppercase tracking-wider mt-0.5">/ month</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full max-w-3xl mx-auto mt-14 pb-8">
              {/* Feature rows — editorial text list, no icons */}
              <div className="space-y-0">
                {[
                  { title: "AI Ad Labeling", body: "Every ad is read by AI and classified as cold, warm, or hot — automatically." },
                  { title: "Visual Funnel Maps", body: "All labeled ads stitched into a visual map of their full customer journey." },
                  { title: "Platform Breakdown", body: "See exactly which platforms they use at each stage — from reach to close." },
                  { title: "Plain-Language Insights", body: "A one-paragraph AI summary of their entire strategy, in plain English." },
                  { title: "Strategic Gaps", body: "Where competitors are ignoring opportunities — and where you can step in." },
                ].map((f, i) => (
                  <div
                    key={f.title}
                    className={`flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-10 py-7 text-left ${i < 4 ? "border-b border-gray-100" : ""}`}
                  >
                    <span className="shrink-0 font-serif text-xl font-normal text-[#343434] sm:w-64">{f.title}</span>
                    <span className="text-[17px] text-[#888] leading-relaxed">{f.body}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>


      <section className="relative py-24" style={{ background: "linear-gradient(to bottom, #fffcef 0%, #f0f0f5 100%)" }}>
        <div className="relative mx-auto flex max-w-[1100px] flex-col items-center px-6 text-center">
          <h3 className="font-serif text-5xl font-normal tracking-tight text-[#343434] md:text-[64px] lg:text-[80px] leading-[1.05]">
            Why This Works
            <br />
            When Ad Library Couldn&apos;t
          </h3>

          <div className="mt-12 grid w-full max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
            <div
              className="relative rounded-[32px] border border-white bg-white/60 backdrop-blur-md p-10 text-left shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-black/5 md:p-8"
            >
              <div className="flex flex-col items-center text-left">

                <h3 className="mb-6 w-full font-sans text-2xl font-black not-italic leading-normal text-[#333] md:text-xl">
                  Most people fail at competitor research because:
                </h3>
                <div className="flex w-full flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center text-lg">
                      <X className="w-5 h-5 text-rose-400" />
                    </div>
                    <div className="flex-1 font-sans text-lg font-medium not-italic leading-normal text-[#808080] md:text-base">
                      They look at isolated ads without seeing the larger funnel
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center text-lg">
                      <X className="w-5 h-5 text-rose-400" />
                    </div>
                    <div className="flex-1 font-sans text-lg font-medium not-italic leading-normal text-[#808080] md:text-base">
                      They aren't sure who the ads are actually targeting
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center text-lg">
                      <X className="w-5 h-5 text-rose-400" />
                    </div>
                    <div className="flex-1 font-sans text-lg font-medium not-italic leading-normal text-[#808080] md:text-base">
                      They look at only one platform instead of the whole journey
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center text-lg">
                      <X className="w-5 h-5 text-rose-400" />
                    </div>
                    <div className="flex-1 font-sans text-lg font-medium not-italic leading-normal text-[#808080] md:text-base">
                      They copy tactics that don't apply to their gaps
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="relative rounded-[32px] border border-white bg-white/60 backdrop-blur-md p-10 text-left shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-black/5 md:p-8"
            >
              <div className="flex flex-col items-center text-left">

                <h3 className="mb-6 w-full font-sans text-2xl font-black not-italic leading-normal text-[#333] md:text-xl">
                  Rival wins because it maps the complete picture:
                </h3>
                <div className="flex w-full flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center text-lg">
                      <Check className="w-5 h-5 text-[#95C14B]" />
                    </div>
                    <div className="flex-1 font-sans text-lg font-medium not-italic leading-normal text-[#808080] md:text-base">
                      Uses AI to label and map ads across platforms
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center text-lg">
                      <Check className="w-5 h-5 text-[#95C14B]" />
                    </div>
                    <div className="flex-1 font-sans text-lg font-medium not-italic leading-normal text-[#808080] md:text-base">
                      Stitches isolated data points into a clear customer journey
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center text-lg">
                      <Check className="w-5 h-5 text-[#95C14B]" />
                    </div>
                    <div className="flex-1 font-sans text-lg font-medium not-italic leading-normal text-[#808080] md:text-base">
                      Reveals exact messaging used for cold vs. hot traffic
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center text-lg">
                      <Check className="w-5 h-5 text-[#95C14B]" />
                    </div>
                    <div className="flex-1 font-sans text-lg font-medium not-italic leading-normal text-[#808080] md:text-base">
                      Finds specific gaps that you can exploit immediately
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center text-lg">
                      <Check className="w-5 h-5 text-[#95C14B]" />
                    </div>
                    <div className="flex-1 font-sans text-lg font-medium not-italic leading-normal text-[#808080] md:text-base">
                      Real competitor funnels, not guesswork.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section id="testimonials" className="py-24 sm:py-32 lg:py-40 bg-[#fbfcfd]/50 relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            className="flex flex-col items-center justify-center max-w-[640px] mx-auto text-center mb-16"
          >
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-300/80 bg-white/60 backdrop-blur-md px-5 py-1.5">
                <span className="text-[12px] font-semibold text-gray-500 tracking-[0.15em] uppercase">Testimonials</span>
              </div>
            </div>

            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-normal tracking-tight text-[#343434]">
              Trusted by those — <br />who move fast.
            </h2>
            <p className="mt-8 text-lg text-gray-500/80 max-w-lg">
              See what our customers have to say about Rival's market intelligence engine.
            </p>
          </motion.div>

          <div className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_85%,transparent)] max-h-[740px] overflow-hidden">
            <TestimonialsColumn 
              testimonials={[
                {
                  text: "This engine revolutionized our operations, streamlining finance and inventory. The cloud-based platform keeps us productive, even remotely.",
                  image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=3540&auto=format&fit=crop",
                  name: "Briana Patton",
                  role: "Operations Manager",
                },
                {
                  text: "Implementing Rival was smooth and quick. The customizable, user-friendly interface made team training effortless across all departments.",
                  image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=3540&auto=format&fit=crop",
                  name: "Bilal Ahmed",
                  role: "IT Manager",
                },
                {
                  text: "The support team is exceptional, guiding us through setup and providing ongoing assistance, ensuring our long-term satisfaction.",
                  image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=3540&auto=format&fit=crop",
                  name: "Saman Malik",
                  role: "Support Lead",
                },
              ]} 
              duration={25} 
            />
            <TestimonialsColumn 
              className="hidden md:block"
              testimonials={[
                {
                  text: "This ERP's seamless integration enhanced our business operations and efficiency. Highly recommend for its intuitive interface and depth.",
                  image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=3540&auto=format&fit=crop",
                  name: "Omar Raza",
                  role: "CEO",
                },
                {
                  text: "Its robust features and quick support have transformed our workflow, making us significantly more efficient in market mapping.",
                  image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=3540&auto=format&fit=crop",
                  name: "Zainab Hussain",
                  role: "Project Manager",
                },
                {
                  text: "The smooth implementation exceeded expectations. It streamlined processes, improving overall business performance and clarity.",
                  image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=3540&auto=format&fit=crop",
                  name: "Aliza Khan",
                  role: "Business Analyst",
                },
              ]} 
              duration={19} 
            />
            <TestimonialsColumn 
              className="hidden lg:block"
              testimonials={[
                {
                  text: "Our business functions improved with a user-friendly design and positive customer feedback. The mapping is next-level.",
                  image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=3540&auto=format&fit=crop",
                  name: "Farhan Siddiqui",
                  role: "Marketing Director",
                },
                {
                  text: "They delivered a solution that exceeded expectations, understanding our needs and enhancing our global operations.",
                  image: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?q=80&w=3540&auto=format&fit=crop",
                  name: "Sana Sheikh",
                  role: "Sales Manager",
                },
                {
                  text: "Using Rival, our online presence and conversions significantly improved, boosting business performance reliably.",
                  image: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=3540&auto=format&fit=crop",
                  name: "Hassan Ali",
                  role: "E-com Manager",
                },
              ]} 
              duration={22} 
            />
          </div>
        </div>
      </section>

      <section id="pricing" className="py-16 sm:py-20 lg:py-24" style={{ background: "linear-gradient(165deg, #e8f4fd 0%, #f0faff 40%, #fffde6 80%, #fffcef 100%)" }}>
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-10 text-center font-serif text-4xl font-normal leading-tight tracking-tight text-[#343434] sm:text-5xl lg:text-6xl">
            <span className="block">
              The All-In-One Market Intelligence Engine
            </span>
          </h2>


          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-300/80 bg-white/60 backdrop-blur-md px-5 py-1.5">
              <span className="text-[12px] font-semibold text-gray-500 tracking-[0.15em] uppercase">What you get</span>
            </div>
          </div>


          <div className="relative mx-auto mb-6 max-w-sm rounded-2xl bg-white p-1 shadow-md">
            <div className="flex flex-col items-center">
              <div className="relative mb-8">
                <RivalLogoImg className="mx-auto h-14 w-auto max-w-[min(280px,85vw)] object-contain sm:h-16" />
              </div>

              <div className="w-full max-w-md px-6 pb-6">
                <div className="flex items-center mb-4 ml-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="14"
                    viewBox="0 0 18 14"
                    fill="none"
                  >
                    <path
                      d="M1 7L6.33333 13L17 1"
                      stroke="#5a99b8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span
                    style={{
                      color: "rgb(128, 128, 128)",
                      fontFamily: "Inter",
                      fontSize: "18px",
                      fontWeight: 500,
                      lineHeight: "normal",
                      marginLeft: "10px",
                    }}
                  >
                    24/7 Market Monitoring
                  </span>
                </div>

                <div className="flex items-center mb-4 ml-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="14"
                    viewBox="0 0 18 14"
                    fill="none"
                  >
                    <path
                      d="M1 7L6.33333 13L17 1"
                      stroke="#5a99b8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span
                    style={{
                      color: "rgb(128, 128, 128)",
                      fontFamily: "Inter",
                      fontSize: "18px",
                      fontWeight: 500,
                      lineHeight: "normal",
                      marginLeft: "10px",
                    }}
                  >
                    Dashboard with full funnel maps
                  </span>
                </div>

                <div className="flex items-center mb-4 ml-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="14"
                    viewBox="0 0 18 14"
                    fill="none"
                  >
                    <path
                      d="M1 7L6.33333 13L17 1"
                      stroke="#5a99b8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span
                    style={{
                      color: "rgb(128, 128, 128)",
                      fontFamily: "Inter",
                      fontSize: "18px",
                      fontWeight: 500,
                      lineHeight: "normal",
                      marginLeft: "10px",
                    }}
                  >
                    AI ad labeling for any niche
                  </span>
                </div>

                <div className="flex items-center mb-4 ml-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="14"
                    viewBox="0 0 18 14"
                    fill="none"
                  >
                    <path
                      d="M1 7L6.33333 13L17 1"
                      stroke="#5a99b8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span
                    style={{
                      color: "rgb(128, 128, 128)",
                      fontFamily: "Inter",
                      fontSize: "18px",
                      fontWeight: 500,
                      lineHeight: "normal",
                      marginLeft: "10px",
                    }}
                  >
                    Competitor strategy breakdown
                  </span>
                </div>

                <div className="flex items-center mb-4 ml-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="14"
                    viewBox="0 0 18 14"
                    fill="none"
                  >
                    <path
                      d="M1 7L6.33333 13L17 1"
                      stroke="#5a99b8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span
                    style={{
                      color: "rgb(128, 128, 128)",
                      fontFamily: "Inter",
                      fontSize: "18px",
                      fontWeight: 500,
                      lineHeight: "normal",
                      marginLeft: "10px",
                    }}
                  >
                    Actionable gap insights
                  </span>
                </div>
              </div>
            </div>
          </div>


        </div>
      </section>

      <section id="faq" className="relative py-12 md:py-20">
        <div
          className="pointer-events-none absolute left-[-100px] top-1/2 h-[350px] w-[350px] -translate-y-1/2 rounded-full blur-[60px]"
          style={{
            background:
              "radial-gradient(circle, rgba(220,240,150,0.5), transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute right-[-100px] top-1/2 h-[350px] w-[350px] -translate-y-1/2 rounded-full blur-[60px]"
          style={{
            background:
              "radial-gradient(circle, rgba(200,190,240,0.5), transparent 70%)",
          }}
        />
        <div className="container mx-auto px-6 max-w-4xl relative z-10">
          <h2 className="mb-12 text-center font-serif text-5xl font-normal leading-tight tracking-tight text-[#343434] sm:mb-16 sm:text-6xl lg:text-7xl">
            F.A.Q.
          </h2>

          <div className="space-y-0">
            {faqData.map((item, index) => (
              <div key={index}>
                <div
                  className="flex cursor-pointer items-center justify-between py-6"
                  onClick={() => toggleFaq(index)}
                >
                  <h3 className="font-sans text-[17px] font-semibold tracking-tight text-[#343434] sm:text-[19px]">
                    {item.question}
                  </h3>
                  <div
                    className="ml-4 flex-shrink-0 transition-transform duration-300"
                    style={{
                      transform:
                        openFaq === index ? "rotate(45deg)" : "rotate(0deg)",
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                    >
                      <path
                        d="M9 1V17M1 9H17"
                        stroke="#343434"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                {openFaq === index && (
                  <div className="pb-6 pr-8 text-[#555] text-base leading-relaxed">
                    {item.answer}
                  </div>
                )}
                <div className="bg-gray-100/60 h-px"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="py-16 sm:py-20 lg:py-24"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(210, 210, 230, 0.9) 0%, rgba(230, 230, 238, 0.5) 40%, transparent 70%)",
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-center font-serif text-5xl font-normal leading-tight tracking-tight text-[#343434] sm:text-6xl lg:text-7xl">
            Start Scaling With AI Today
          </h2>

          <div className="mx-auto mt-10 flex flex-col items-center justify-center">
            <a href="/pricing">
              <button
                className="group relative inline-flex items-center gap-2 rounded-full px-12 py-4 text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: "rgb(52, 52, 52)" }}
              >
                <span className="text-[15px] font-semibold tracking-tight">Buy Now — Only $99</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E5E5E5]">
        <div className="container mx-auto px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-12">
            <div className="md:col-span-4">
              <a href="/" className="mb-4 inline-block">
                <RivalLogoImg className="h-7 w-auto max-w-[200px] object-contain object-left sm:h-8" />
              </a>
              <p className="mb-6 font-sans text-sm font-medium not-italic leading-relaxed text-[#888]">
                AI-powered market intelligence that helps you win by spying on
                what works.
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="https://www.facebook.com/trycrushai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition-opacity duration-200"
                  aria-label="Facebook"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="#898989"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/rival.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition-opacity duration-200"
                  aria-label="Instagram"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="#898989"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a
                  href="https://www.trustpilot.com/review/rival.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition-opacity duration-200"
                  aria-label="Trustpilot"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="#898989"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </a>
                <a
                  href="https://www.youtube.com/channel/UCoKbnEJfXHH0X580T3IQI9A"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition-opacity duration-200"
                  aria-label="YouTube"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="#898989"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
                <a
                  href="https://www.tiktok.com/@rival.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition-opacity duration-200"
                  aria-label="TikTok"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="#898989"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="md:col-span-8">
              <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                <div>
                  <h3 className="mb-4 font-sans text-sm font-semibold not-italic leading-normal text-[#343434]">
                    Product
                  </h3>
                  <ul className="space-y-3">
                    <li>
                      <a
                        href="/"
                        className="font-sans text-sm font-medium not-italic leading-normal text-[#888] transition-opacity duration-200 hover:opacity-70"
                      >
                        Solution
                      </a>
                    </li>
                    <li>
                      <a
                        href="/pricing"
                        className="font-sans text-sm font-medium not-italic leading-normal text-[#888] transition-opacity duration-200 hover:opacity-70"
                      >
                        Pricing
                      </a>
                    </li>
                    <li>
                      <a
                        href="/#how-it-works"
                        className="font-sans text-sm font-medium not-italic leading-normal text-[#888] transition-opacity duration-200 hover:opacity-70"
                      >
                        How It Works
                      </a>
                    </li>
                    <li>
                      <a
                        href="/#testimonials"
                        className="font-sans text-sm font-medium not-italic leading-normal text-[#888] transition-opacity duration-200 hover:opacity-70"
                      >
                        Reviews
                      </a>
                    </li>
                    <li>
                      <Link
                        href="/dashboard/spy"
                        className="font-sans text-sm font-medium not-italic leading-normal text-[#888] transition-opacity duration-200 hover:opacity-70"
                      >
                        Go to Demo
                      </Link>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="mb-4 font-sans text-sm font-semibold not-italic leading-normal text-[#343434]">
                    Company
                  </h3>
                  <ul className="space-y-3">
                    <li>
                      <a
                        href="/about"
                        className="font-sans text-sm font-medium not-italic leading-normal text-[#888] transition-opacity duration-200 hover:opacity-70"
                      >
                        About
                      </a>
                    </li>
                    <li>
                      <a
                        href="/blog"
                        className="font-sans text-sm font-medium not-italic leading-normal text-[#888] transition-opacity duration-200 hover:opacity-70"
                      >
                        Blog
                      </a>
                    </li>
                    <li>
                      <a
                        href="/contact"
                        className="font-sans text-sm font-medium not-italic leading-normal text-[#888] transition-opacity duration-200 hover:opacity-70"
                      >
                        Contact
                      </a>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="mb-4 font-sans text-sm font-semibold not-italic leading-normal text-[#343434]">
                    Legal
                  </h3>
                  <ul className="space-y-3">
                    <li>
                      <a
                        href="/privacy"
                        className="font-sans text-sm font-medium not-italic leading-normal text-[#888] transition-opacity duration-200 hover:opacity-70"
                      >
                        Privacy Policy
                      </a>
                    </li>
                    <li>
                      <a
                        href="/terms"
                        className="font-sans text-sm font-medium not-italic leading-normal text-[#888] transition-opacity duration-200 hover:opacity-70"
                      >
                        Terms of Service
                      </a>
                    </li>
                    <li>
                      <a
                        href="/cookies"
                        className="font-sans text-sm font-medium not-italic leading-normal text-[#888] transition-opacity duration-200 hover:opacity-70"
                      >
                        Cookie Policy
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-[#E5E5E5] pt-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="font-sans text-sm font-medium not-italic leading-normal text-[#888]">
                © 2026 Rival. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
