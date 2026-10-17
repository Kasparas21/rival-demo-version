"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarRange,
  ChevronDown,
  Gauge,
  Inbox,
  LayoutGrid,
  MailOpen,
  Map as MapIcon,
  Menu,
  Newspaper,
  PlayCircle,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wrench,
  X,
} from "lucide-react";
import {
  GoogleLogo,
  LinkedInLogo,
  MetaLogo,
  PinterestLogo,
  SnapchatLogo,
  TikTokLogo,
} from "@/components/platform-logos";
import { RivalLogoImg } from "@/components/rival-logo";
import type { LandingCopy } from "@/lib/i18n/landing/types";
import type { Locale } from "@/lib/i18n/locale";
import { getSiteNav, type NavDropdown } from "@/lib/marketing/site-nav";
import { GlowCta } from "./glow-cta";
import styles from "./site-header.module.css";

/** Scroll distance after which the header shrinks to the logo and "Try now". */
const COMPACT_AFTER_PX = 24;

type Art = { color: string; short?: string; render: (className: string) => ReactNode };

/** The big outlined icon and colour each menu link gets. */
export const NAV_ART: Record<string, Art> = {
  meta: { color: "#5b8cff", short: "Meta", render: (c) => <MetaLogo className={c} /> },
  google: { color: "#34c26a", short: "Google", render: (c) => <GoogleLogo className={c} /> },
  tiktok: { color: "#ff5c8a", short: "TikTok", render: (c) => <TikTokLogo className={c} /> },
  linkedin: { color: "#46b4ff", short: "LinkedIn", render: (c) => <LinkedInLogo className={c} /> },
  pinterest: { color: "#ff6b5b", short: "Pinterest", render: (c) => <PinterestLogo className={c} /> },
  snapchat: { color: "#ffd84d", short: "Snapchat", render: (c) => <SnapchatLogo className={c} /> },
  "ad-library": { color: "#ff5c8a", short: "Ad Library", render: (c) => <LayoutGrid className={c} strokeWidth={2.3} /> },
  "strategy-map": { color: "#b69cff", short: "Strategy Map", render: (c) => <MapIcon className={c} strokeWidth={2.3} /> },
  "stealable-angles": { color: "#5b8cff", short: "Stealable Angles", render: (c) => <Sparkles className={c} strokeWidth={2.3} /> },
  "copy-vault": { color: "#ff9b5a", short: "Copy Vault", render: (c) => <BookOpen className={c} strokeWidth={2.3} /> },
  timeline: { color: "#4fd1a1", short: "Timeline", render: (c) => <CalendarRange className={c} strokeWidth={2.3} /> },
  "activity-score": { color: "#ffd24d", short: "Activity Score", render: (c) => <Gauge className={c} strokeWidth={2.3} /> },
  "audience-inference": { color: "#46c8ff", short: "Audience", render: (c) => <Users className={c} strokeWidth={2.3} /> },
  "monday-digest": { color: "#ff7a6b", short: "Monday Digest", render: (c) => <Inbox className={c} strokeWidth={2.3} /> },
  "platform-prioritization": { color: "#9b7bff", short: "Platform Focus", render: (c) => <SlidersHorizontal className={c} strokeWidth={2.3} /> },
  "email-marketing": { color: "#3cd0c4", short: "Email Intel", render: (c) => <MailOpen className={c} strokeWidth={2.3} /> },
  tutorials: { color: "#46c8ff", render: (c) => <PlayCircle className={c} strokeWidth={2.3} /> },
  blog: { color: "#ff5c8a", render: (c) => <Newspaper className={c} strokeWidth={2.3} /> },
  tools: { color: "#ffd24d", render: (c) => <Wrench className={c} strokeWidth={2.3} /> },
};

/** A colourful outlined icon tile, also used on the /features page. */
export function NavArtTile({ artKey, label, size = "md" }: { artKey: string; label?: string; size?: "sm" | "md" | "lg" }) {
  const art = NAV_ART[artKey];
  if (!art) return null;
  return (
    <span className={styles.tileIcon} data-size={size} style={{ "--c": art.color } as CSSProperties} aria-label={label}>
      {art.render(styles.tileGlyph)}
    </span>
  );
}

function MegaPanel({
  item,
  open,
  onNavigate,
}: {
  item: NavDropdown;
  open: boolean;
  onNavigate: () => void;
}) {
  return (
    <div id={`nav-${item.key}`} className={styles.mega} data-open={open || undefined} data-count={item.items.length}>
      <div className={styles.megaGrid}>
        {item.items.map((link, index) => {
          const art = link.key ? NAV_ART[link.key] : undefined;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={styles.tile}
              style={{ "--c": art?.color ?? "#9ad1ff", "--i": index } as CSSProperties}
              onClick={onNavigate}
            >
              <span className={styles.tileIcon}>{art?.render(styles.tileGlyph)}</span>
              <span className={styles.tileLabel}>{art?.short ?? link.label}</span>
            </Link>
          );
        })}
      </div>
      {item.more && (
        <Link href={item.more.href} className={styles.megaMore} onClick={onNavigate}>
          {item.more.label}
          <ArrowRight size={15} strokeWidth={2.4} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

/**
 * Floating glass pills: logo, the menu (AdSpy, Features and Resources open big icon menus on
 * hover) and "Try now". From the first bit of scrolling only the logo and the button stay,
 * gliding to the edges. `fixed` is for pages whose layout leaves room for a fixed header.
 */
export function SiteHeader({
  copy,
  locale,
  fixed = false,
}: {
  copy: LandingCopy["header"];
  locale: Locale;
  fixed?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdown, setDropdown] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLAnchorElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef(0);
  const nav = getSiteNav(locale);

  const close = () => {
    window.clearTimeout(closeTimer.current);
    setMenuOpen(false);
    setDropdown(null);
  };
  const hoverOpen = (key: string) => {
    window.clearTimeout(closeTimer.current);
    setDropdown(key);
  };
  const hoverClose = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setDropdown(null), 180);
  };
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setDropdown(null);
        setMenuOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (dropdown) {
        headerRef.current?.querySelector<HTMLButtonElement>('[data-dropdown][aria-expanded="true"]')?.focus();
        setDropdown(null);
      } else if (menuOpen) {
        menuRef.current?.focus();
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [menuOpen, dropdown]);

  // From the very first bit of scrolling the header shrinks to the logo on the left and
  // "Try now" on the right; back at the top it opens up again.
  const compactRef = useRef(false);
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const next = window.scrollY > COMPACT_AFTER_PX;
      if (next === compactRef.current) return;
      compactRef.current = next;
      setCompact(next);
      if (next) {
        setDropdown(null);
        setMenuOpen(false);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    frame = requestAnimationFrame(check);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // How far the logo and the button glide to reach the edges. Layout offsets ignore
  // transforms, so these stay right in either state.
  useEffect(() => {
    const inner = innerRef.current;
    const logo = logoRef.current;
    const actions = actionsRef.current;
    const header = headerRef.current;
    if (!inner || !logo || !actions || !header) return;
    const measure = () => {
      const style = getComputedStyle(inner);
      const left = parseFloat(style.paddingLeft);
      const right = inner.clientWidth - parseFloat(style.paddingRight);
      header.style.setProperty("--logo-shift", `${Math.max(0, logo.offsetLeft - left)}px`);
      header.style.setProperty("--cta-shift", `${Math.max(0, right - (actions.offsetLeft + actions.offsetWidth))}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <header ref={headerRef} className={styles.header} data-compact={compact || undefined} data-fixed={fixed || undefined}>
      <div ref={innerRef} className={styles.inner}>
        <Link ref={logoRef} href="/" aria-label={copy.homeAria} className={styles.logo}>
          <RivalLogoImg />
        </Link>
        <nav
          id="site-navigation"
          aria-label={copy.primaryNavAria}
          aria-hidden={compact || undefined}
          className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`}
        >
          {nav.map((item) =>
            item.type === "link" ? (
              <Link key={item.label} href={item.href} tabIndex={compact ? -1 : undefined} onClick={close}>
                {item.label}
              </Link>
            ) : (
              <div
                className={styles.group}
                key={item.key}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse" && !menuOpen) hoverOpen(item.key);
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse" && !menuOpen) hoverClose();
                }}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setDropdown(null);
                }}
              >
                <button
                  type="button"
                  data-dropdown
                  tabIndex={compact ? -1 : undefined}
                  aria-expanded={dropdown === item.key}
                  aria-controls={`nav-${item.key}`}
                  onClick={() => setDropdown(dropdown === item.key ? null : item.key)}
                >
                  {item.label}
                  <ChevronDown size={13} strokeWidth={2.4} aria-hidden="true" />
                </button>
                <MegaPanel item={item} open={dropdown === item.key} onNavigate={close} />
              </div>
            ),
          )}
          <Link href="/login" className={styles.login} tabIndex={compact ? -1 : undefined} onClick={close}>
            Log in
          </Link>
        </nav>
        <div ref={actionsRef} className={styles.actions}>
          <button
            ref={menuRef}
            type="button"
            className={styles.menuToggle}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="site-navigation"
            tabIndex={compact ? -1 : undefined}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <GlowCta href="/pricing">{copy.tryNow}</GlowCta>
        </div>
      </div>
    </header>
  );
}
