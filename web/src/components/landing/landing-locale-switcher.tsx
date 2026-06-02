"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { glassPillMenuClass } from "@/components/ui/glass-styles";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/locale";

const OPTIONS: { locale: Locale; label: string }[] = [
  { locale: "en", label: "EN" },
  { locale: "de", label: "DE" },
  { locale: "nl", label: "NL" },
];

type MenuPosition = {
  top: number;
  right: number;
  minWidth: number;
};

type Props = {
  currentLocale: Locale;
  ariaLabel: string;
  /** `minimal` — small muted label for onboarding cards */
  variant?: "default" | "minimal";
};

export function LandingLocaleSwitcher({ currentLocale, ariaLabel, variant = "default" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const currentLabel = OPTIONS.find((o) => o.locale === currentLocale)?.label ?? "EN";

  const setLocale = (locale: Locale) => {
    setOpen(false);
    if (locale === currentLocale) return;
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.refresh();
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
        minWidth: Math.max(rect.width, 76),
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const menu =
    open && menuPosition && mounted ? (
      <ul
        ref={menuRef}
        role="listbox"
        aria-label={ariaLabel}
        style={{
          position: "fixed",
          top: menuPosition.top,
          right: menuPosition.right,
          minWidth: menuPosition.minWidth,
          zIndex: 60,
        }}
        className={`isolate ${glassPillMenuClass}`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent"
        />
        <div className="relative z-[1] px-1 py-0.5">
          {OPTIONS.map(({ locale, label }) => {
            const selected = locale === currentLocale;
            return (
              <li key={locale} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => setLocale(locale)}
                  className={`block w-full rounded-xl px-2.5 py-1.5 text-left text-xs font-medium transition-colors duration-150 [text-shadow:0_1px_12px_rgba(255,255,255,0.85)] ${
                    selected
                      ? "bg-white/46 text-[#1a1a1a]"
                      : "text-gray-700 hover:bg-white/35 hover:text-[#1a1a1a]"
                  }`}
                >
                  {label}
                </button>
              </li>
            );
          })}
        </div>
      </ul>
    ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={
          variant === "minimal"
            ? `inline-flex shrink-0 items-center gap-0.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/40 focus-visible:ring-offset-1 ${
                open ? "text-gray-800" : "text-gray-400 hover:text-gray-600"
              }`
            : `inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 text-xs font-medium transition-[color,background-color] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-1 ${
                open ? "text-[#1a1a1a]" : "text-gray-600 hover:text-[#1a1a1a]"
              }`
        }
      >
        <span aria-hidden>{currentLabel}</span>
        <ChevronDown
          className={`shrink-0 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""} ${
            variant === "minimal" ? "size-3 opacity-70" : "size-3.5"
          }`}
          aria-hidden
        />
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </>
  );
}
