"use client";

import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { glassPillMenuClass, glassPillMobileMenuClass } from "@/components/ui/glass-styles";
import type { SiteNavItem } from "@/lib/marketing/site-nav";

type Props = {
  items: SiteNavItem[];
  isDark?: boolean;
  ariaLabel: string;
};

const NAV_ITEM_LAYOUT =
  "inline-flex h-8 shrink-0 items-center gap-1 leading-none whitespace-nowrap";

const DROPDOWN_MOTION =
  "transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

function navLinkClass(isDark: boolean, active?: boolean) {
  return [
    NAV_ITEM_LAYOUT,
    "rounded-sm text-[11px] font-semibold uppercase tracking-[0.06em] transition hover:opacity-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a7fa5] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
    isDark ? "text-white/85" : "text-[#1a1a1a]",
    active ? "underline decoration-2 underline-offset-4" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function dropdownMenuShellClass(isDark: boolean) {
  return isDark
    ? "overflow-hidden rounded-2xl border border-white/18 bg-[#0c1219]/94 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_16px_48px_-8px_rgba(0,0,0,0.55)] backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-white/15"
    : glassPillMenuClass;
}

function mobileNavMenuShellClass(isDark: boolean) {
  return isDark
    ? "overflow-hidden rounded-2xl border border-white/22 bg-[#0c1219]/97 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_20px_56px_-12px_rgba(0,0,0,0.6)] backdrop-blur-3xl backdrop-saturate-150 ring-1 ring-white/18"
    : glassPillMobileMenuClass;
}

function DropdownPanel({
  items,
  id,
  isOpen,
  isDark,
  onClose,
}: {
  items: { label: string; href: string }[];
  id: string;
  isOpen: boolean;
  isDark: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className={[
        "absolute left-1/2 top-full z-50 w-max min-w-[13.5rem] -translate-x-1/2 pt-1.5",
        DROPDOWN_MOTION,
        isOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1.5 opacity-0",
      ].join(" ")}
      aria-hidden={!isOpen}
    >
      <div
        id={id}
        role="menu"
        className={dropdownMenuShellClass(isDark)}
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            role="menuitem"
            tabIndex={isOpen ? 0 : -1}
            onClick={onClose}
            className={[
              "block px-4 py-2 text-sm transition-colors duration-150",
              isDark
                ? "text-white/75 hover:bg-white/10 hover:text-white"
                : "text-[#374151] hover:bg-white/70 hover:text-[#111827]",
            ].join(" ")}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function DesktopNavItem({
  item,
  isDark,
}: {
  item: SiteNavItem;
  isDark: boolean;
}) {
  const itemId = useId();
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  if (item.type === "link") {
    const isHash = item.href.startsWith("/#");
    const className = navLinkClass(isDark);
    if (isHash) {
      return (
        <a key={item.href} href={item.href} className={className}>
          {item.label}
        </a>
      );
    }
    return (
      <Link key={item.href} href={item.href} className={className}>
        {item.label}
      </Link>
    );
  }

  const menuId = `${itemId}-menu`;

  return (
    <div
      key={item.label}
      className={`relative ${NAV_ITEM_LAYOUT}`}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) close();
      }}
    >
      <button
        type="button"
        className={navLinkClass(isDark, isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
      >
        <span>{item.label}</span>
        <ChevronDown
          className={[
            "size-3.5 shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isOpen ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden
        />
      </button>
      <DropdownPanel
        id={menuId}
        items={item.items}
        isOpen={isOpen}
        isDark={isDark}
        onClose={close}
      />
    </div>
  );
}

function MobileNavPanel({
  items,
  isDark,
  isOpen,
  onClose,
}: {
  items: SiteNavItem[];
  isDark: boolean;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      id="landing-mobile-nav"
      className={`fixed inset-x-3 top-[4.25rem] z-50 max-h-[calc(100dvh-5.5rem)] overflow-y-auto rounded-2xl p-4 md:hidden ${mobileNavMenuShellClass(isDark)}`}
    >
      <div className="space-y-4">
        {items.map((item) => {
          if (item.type === "link") {
            const isHash = item.href.startsWith("/#");
            const className = `block text-sm font-semibold ${isDark ? "text-white/90" : "text-[#111827]"}`;
            return isHash ? (
              <a key={item.href} href={item.href} className={className} onClick={onClose}>
                {item.label}
              </a>
            ) : (
              <Link key={item.href} href={item.href} className={className} onClick={onClose}>
                {item.label}
              </Link>
            );
          }

          return (
            <div key={item.label}>
              <p
                className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-white/45" : "text-[#9ca3af]"}`}
              >
                {item.label}
              </p>
              <ul className="mt-2 space-y-1">
                {item.items.map((sub) => (
                  <li key={sub.href}>
                    <Link
                      href={sub.href}
                      className={`block rounded-lg px-2 py-2 text-sm ${isDark ? "text-white/75 hover:bg-white/10" : "text-[#374151] hover:bg-white/45"}`}
                      onClick={onClose}
                    >
                      {sub.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Desktop nav links - centered in the header pill from `md` up. */
export function LandingHeaderNav({ items, isDark = false, ariaLabel }: Props) {
  return (
    <nav
      aria-label={ariaLabel}
      className="hidden min-h-8 min-w-0 flex-1 flex-row items-center justify-center gap-4 md:flex lg:gap-5"
    >
      {items.map((item) => (
        <DesktopNavItem
          key={item.type === "link" ? item.href : item.label}
          item={item}
          isDark={isDark}
        />
      ))}
    </nav>
  );
}

/** Mobile hamburger + slide-down menu - sits in the header’s right action cluster. */
export function LandingHeaderMobileMenu({ items, isDark = false }: Pick<Props, "items" | "isDark">) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <>
      <button
        type="button"
        className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full md:hidden ${isDark ? "text-white/90 hover:bg-white/10" : "text-[#1a1a1a] hover:bg-black/[0.05]"}`}
        aria-expanded={mobileOpen}
        aria-controls="landing-mobile-nav"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        onClick={() => setMobileOpen((v) => !v)}
      >
        {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      <MobileNavPanel items={items} isDark={isDark} isOpen={mobileOpen} onClose={closeMobile} />
    </>
  );
}
