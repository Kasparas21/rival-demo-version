import type { ComponentType } from "react";

type LogoProps = { className?: string };

export function UnconnectedPlatformPlaceholder({
  title,
  Logo,
  logoClassName,
  compact = false,
}: {
  title: string;
  Logo: ComponentType<LogoProps>;
  /** e.g. Twitter needs `text-[#0f1419]` */
  logoClassName?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <section className="rounded-xl border border-dashed border-[#e5e7eb] bg-white/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white border border-[#e5e7eb] flex items-center justify-center shrink-0 shadow-sm">
            <Logo className={["w-4 h-4", logoClassName].filter(Boolean).join(" ")} />
          </div>
          <p className="text-[13px] text-[#6b7280]">
            <span className="font-semibold text-[#374151]">{title}</span> is not connected in this build.
          </p>
        </div>
      </section>
    );
  }
  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-white border border-[#e5e7eb] flex items-center justify-center shrink-0 shadow-sm">
          <Logo className={["w-5 h-5", logoClassName].filter(Boolean).join(" ")} />
        </div>
        <div>
          <h3 className="font-semibold text-[#343434] text-[16px]">{title}</h3>
          <p className="text-[13px] text-[#6b7280] mt-0.5">0 ads — no API connected</p>
        </div>
      </div>
      <div className="rounded-2xl border border-dashed border-[#e5e7eb] bg-white/50 px-5 py-8 text-[14px] text-[#6b7280] leading-relaxed">
        <p className="font-medium text-[#374151] mb-2">Live ads aren&apos;t available here yet</p>
        <p>
          This dashboard only pulls real creatives from <strong>ScrapeCreators</strong> for{" "}
          <strong>Meta</strong>, <strong>Google / YouTube</strong>, <strong>LinkedIn</strong>, <strong>TikTok</strong>,{" "}
          <strong>Microsoft Ads</strong>, and <strong>Pinterest</strong> (selected channels). This
          channel has no integration in this build, so we don&apos;t show placeholder counts or mock
          cards.
        </p>
      </div>
    </section>
  );
}
