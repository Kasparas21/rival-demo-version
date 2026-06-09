import type { CSSProperties } from "react";

const PLATFORM_NAMES = /(Meta|Google|TikTok|LinkedIn|Pinterest|Snapchat)/g;

/** Brand neon — one tight halo per glyph via text-shadow. */
const PLATFORM_GLOW: Record<string, { neon: string }> = {
  Meta: { neon: "#1877f2" },
  Google: { neon: "#34a853" },
  TikTok: { neon: "#ff2d8a" },
  LinkedIn: { neon: "#0077b5" },
  Pinterest: { neon: "#c8102e" },
  Snapchat: { neon: "#e6c200" },
};

function PlatformGlowLetter({ char, neon }: { char: string; neon: string }) {
  return (
    <span className="hero-platform-glow-letter" style={{ "--platform-neon": neon } as CSSProperties}>
      {char}
    </span>
  );
}

function PlatformGlowWord({ name }: { name: string }) {
  const style = PLATFORM_GLOW[name];
  if (!style) return name;

  return (
    <span className="hero-platform-word">
      {Array.from(name).map((char, index) => (
        <PlatformGlowLetter key={`${name}-${index}`} char={char} neon={style.neon} />
      ))}
    </span>
  );
}

type Props = {
  children: string;
};

/** Wraps known ad-platform names with a tight per-letter brand neon. */
export function HeroSublinePlatformGlow({ children }: Props) {
  const parts = children.split(PLATFORM_NAMES);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        if (PLATFORM_GLOW[part]) {
          return <PlatformGlowWord key={`${part}-${index}`} name={part} />;
        }
        return part;
      })}
    </>
  );
}
