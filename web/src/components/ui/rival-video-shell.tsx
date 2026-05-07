import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const HERO_VIDEO_SRC = "/smooth_animation_for_202603181849.mp4";

type FooterTint = "light" | "none";

export type RivalVideoBackdropProps = {
  className?: string;
  /** Match login/onboarding shells: extra bottom wash (`light`). */
  footerTint?: FooterTint;
};

/** Same visuals as `/login`: base wash + looping video + soft color blobs over white glass layers. */
export function RivalVideoBackdrop({ className, footerTint = "none" }: RivalVideoBackdropProps) {
  return (
    <div aria-hidden className={cn("relative h-full min-h-0 w-full overflow-hidden bg-[#f2f4f8]", className)}>
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 z-0 h-full w-full object-cover"
      >
        <source src={HERO_VIDEO_SRC} type="video/mp4" />
      </video>

      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[min(600px,90vw)] w-[min(600px,90vw)] rounded-full bg-[#E9F1B5]/28 blur-[130px]" />
        <div className="absolute right-[-10%] top-[0%] h-[min(700px,95vw)] w-[min(700px,95vw)] rounded-full bg-[#F3E3FF]/32 blur-[150px]" />
        <div className="absolute bottom-[0%] left-[20%] h-[min(500px,80vw)] w-[min(500px,80vw)] rounded-full bg-[#DDF1FD]/28 blur-[120px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/18 via-white/10 to-white/14" />
        {footerTint === "light" ? (
          <div className="absolute inset-0 bg-gradient-to-t from-[#e8ecf4]/22 to-transparent" />
        ) : null}
      </div>
    </div>
  );
}

type Props = {
  children: ReactNode;
  /** Slightly stronger “page” feel (onboarding) vs login’s lighter wash */
  footerTint?: FooterTint;
};

export function RivalVideoShell({ children, footerTint = "none" }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f2f4f8]">
      <div className="absolute inset-0">
        <RivalVideoBackdrop footerTint={footerTint} className="h-full min-h-full" />
      </div>

      <div className="relative z-[2] flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
        {children}
      </div>
    </div>
  );
}
