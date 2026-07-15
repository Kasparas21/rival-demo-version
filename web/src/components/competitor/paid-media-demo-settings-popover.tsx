"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { GlassToggle } from "@/components/autopilot/autopilot-glass-ui";
import { useSalesDemoSettings } from "@/hooks/use-sales-demo-settings";
import { DEFAULT_SALES_DEMO_SETTINGS } from "@/lib/demo/sales-demo-settings";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLButtonElement | null>;
  competitorDomain: string;
};

function DemoSettingRow({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold leading-snug text-slate-900">{label}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{description}</p>
      </div>
      <GlassToggle enabled={enabled} onChange={onChange} size="sm" />
    </div>
  );
}

export function PaidMediaDemoSettingsPopover({ open, onClose, anchorRef, competitorDomain }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const { settings, updateSettings } = useSalesDemoSettings(competitorDomain);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    if (!anchor) return;

    const updatePosition = () => {
      const rect = anchor.getBoundingClientRect();
      const panelWidth = 320;
      const margin = 8;
      let left = rect.right - panelWidth;
      left = Math.max(margin, Math.min(left, window.innerWidth - panelWidth - margin));
      const top = rect.bottom + margin;
      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, onClose, anchorRef]);

  if (!mounted || !open || !settings) return null;

  const s = settings;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Demo settings"
      className={cn(
        "fixed z-[200] w-[min(320px,calc(100vw-16px))] overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-[0_16px_48px_-12px_rgba(15,23,42,0.22)]",
        "animate-in fade-in zoom-in-95 duration-150",
      )}
      style={{ top: position.top, left: position.left }}
    >
      <div className="flex items-start justify-between gap-2 border-b border-violet-100 bg-gradient-to-b from-violet-50/90 to-white px-4 py-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-violet-700">Demo settings</p>
          <p className="mt-0.5 text-[13px] font-semibold text-slate-900">Ad library display</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close demo settings"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="divide-y divide-slate-100 px-4 py-1">
        <DemoSettingRow
          label="Only ads with previews"
          description="Hide creatives without a dashboard image or video."
          enabled={s.onlyWithPreviews}
          onChange={(onlyWithPreviews) => updateSettings({ onlyWithPreviews })}
        />
        <DemoSettingRow
          label="Hide empty platforms"
          description="Don't show platform sections with no matching ads."
          enabled={s.hideEmptyPlatforms}
          onChange={(hideEmptyPlatforms) => updateSettings({ hideEmptyPlatforms })}
        />
        <DemoSettingRow
          label="Active ads only"
          description="Show only ads that are currently running."
          enabled={s.activeAdsOnly}
          onChange={(activeAdsOnly) => updateSettings({ activeAdsOnly })}
        />
      </div>

      <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-2.5">
        <button
          type="button"
          onClick={() => updateSettings({ ...DEFAULT_SALES_DEMO_SETTINGS })}
          className="text-[11px] font-semibold text-violet-700 underline-offset-2 hover:underline"
        >
          Reset to defaults
        </button>
        <p className="mt-1 text-[10px] leading-snug text-slate-500">
          Applies to the Ad Library while you demo. Saved in this browser only.
        </p>
      </div>
    </div>,
    document.body,
  );
}
