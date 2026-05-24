"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export function useDismissOnOutsideClick(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose]);

  return ref;
}

type MenuButtonProps = {
  label: ReactNode;
  icon?: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
};

export function TimelineMenuButton({ label, icon, active, onClick, className }: MenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium text-slate-700 transition-colors",
        active ? "border-slate-300 bg-slate-100" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
        className,
      )}
    >
      {icon}
      <span>{label}</span>
      <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden />
    </button>
  );
}

type MenuPanelProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
};

export function TimelineMenuPanel({ open, onClose, children, className, align = "left" }: MenuPanelProps) {
  const ref = useDismissOnOutsideClick(open, onClose);
  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg",
        align === "right" ? "right-0" : "left-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

type MenuItemProps = {
  label: ReactNode;
  selected?: boolean;
  onClick: () => void;
  icon?: ReactNode;
  trailing?: ReactNode;
};

export function TimelineMenuItem({ label, selected, onClick, icon, trailing }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors",
        selected ? "bg-slate-100 font-medium text-slate-900" : "text-slate-700 hover:bg-slate-50",
      )}
    >
      {icon ? <span className="shrink-0 text-slate-500">{icon}</span> : null}
      <span className="min-w-0 flex-1">{label}</span>
      {trailing}
      {selected ? <Check className="h-3.5 w-3.5 shrink-0 text-slate-900" aria-hidden /> : null}
    </button>
  );
}

type ToggleRowProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
};

export function TimelineToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 px-3 py-2.5 hover:bg-slate-50">
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-slate-900">{label}</span>
        {description ? <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{description}</span> : null}
      </span>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        className={cn(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-slate-900" : "bg-slate-200",
        )}
        aria-hidden
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </span>
    </label>
  );
}

export function useMenuState() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  return {
    openKey,
    isOpen: (key: string) => openKey === key,
    toggle: (key: string) => setOpenKey((prev) => (prev === key ? null : key)),
    close: () => setOpenKey(null),
  };
}
