"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowUpRight,
  BellRing,
  Bookmark,
  Check,
  ChevronDown,
  Copy,
  Mail,
  Play,
  Search,
  Sparkles,
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
import styles from "./bullet-visuals.module.css";

export type LogoKey = "meta" | "google" | "tiktok" | "linkedin" | "pinterest" | "snapchat";

const LOGOS: Record<LogoKey, (props: { className?: string }) => ReactNode> = {
  meta: MetaLogo,
  google: GoogleLogo,
  tiktok: TikTokLogo,
  linkedin: LinkedInLogo,
  pinterest: PinterestLogo,
  snapchat: SnapchatLogo,
};

export function PlatformMark({ logo, className }: { logo: LogoKey; className?: string }) {
  const Logo = LOGOS[logo];
  return <Logo className={className} />;
}

type FormatShape = "image" | "video" | "carousel" | "search" | "banner" | "pin" | "story";
type Tag = "PRIMARY" | "SECONDARY" | "MINIMAL" | "INACTIVE";

/** The small illustration on each bullet card. Every one is example data, drawn in code. */
export type BulletVisualSpec =
  | { kind: "chips"; items: string[]; active: number[] }
  | { kind: "lifespan"; rows: Array<{ label: string; start: number; end: number; note: string; live: boolean }> }
  | { kind: "source"; logo: LogoKey; label: string; image?: string }
  | { kind: "grid" }
  | { kind: "summary"; title: string; lines: string[] }
  | { kind: "bars"; rows: Array<{ label: string; value: number; was?: number; logo?: LogoKey; note?: string }> }
  | { kind: "versus"; left: string; right: string; rows: Array<{ label: string; left: boolean; right: boolean }> }
  | { kind: "save"; toast: string; image?: string; logo?: LogoKey }
  | { kind: "sorted"; head: string; rows: Array<{ text: string; note: string }> }
  | { kind: "score"; value: number; tier: string; note: string }
  | { kind: "tags"; items: Array<{ label: string; size: 1 | 2 | 3 }> }
  | { kind: "calendar"; title: string; hits: number[] }
  | { kind: "columns"; labels: string[]; a: number[]; b?: number[]; legend?: [string, string] }
  | { kind: "classify"; rows: Array<{ logo: LogoKey; label?: string; tag: Tag }> }
  | { kind: "alerts"; items: string[] }
  | { kind: "inbox"; address: string; from: string; subject: string }
  | { kind: "formats"; items: Array<{ label: string; shape: FormatShape; image?: string }> }
  | { kind: "search"; query: string; name: string; sub: string; logo: LogoKey }
  | { kind: "checklist"; title: string; rows: Array<{ logo: LogoKey; label: string }> };

const vars = (values: Record<string, string | number>) => values as CSSProperties;
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const GRID_TAGS = [
  ["FLAGSHIP", "TESTING", "STABLE"],
  ["TESTING", "FLAGSHIP", "DECLINING"],
  ["STABLE", "TESTING", "FLAGSHIP"],
];

function MiniAd({ logo = "meta", image, children }: { logo?: LogoKey; image?: string; children?: ReactNode }) {
  return (
    <span className={styles.miniAd}>
      <span className={styles.miniAdHead}>
        <PlatformMark logo={logo} className={styles.miniAdLogo} />
        <b>Sponsored</b>
        {children}
      </span>
      <span className={styles.miniAdImage}>
        {image ? <Image src={image} alt="" fill sizes="220px" /> : <i />}
      </span>
      <span className={styles.miniAdLine} />
      <span className={styles.miniAdLine} data-short />
    </span>
  );
}

function FormatTile({ shape, image }: { shape: FormatShape; image?: string }) {
  if (shape === "search") {
    return (
      <span className={styles.fmt} data-shape="search">
        <em>Ad · northwind.com</em>
        <b />
        <i />
        <i data-short />
      </span>
    );
  }
  if (shape === "banner") {
    return (
      <span className={styles.fmt} data-shape="banner">
        <b />
        <i />
        <em />
      </span>
    );
  }
  return (
    <span className={styles.fmt} data-shape={shape}>
      {image ? <Image src={image} alt="" fill sizes="120px" /> : <span className={styles.fmtFill} />}
      {shape === "video" && (
        <span className={styles.fmtPlay}>
          <Play size={12} fill="currentColor" strokeWidth={0} />
        </span>
      )}
      {shape === "carousel" && (
        <span className={styles.fmtDots}>
          <i data-on />
          <i />
          <i />
        </span>
      )}
      {shape === "story" && (
        <span className={styles.fmtStory}>
          <i data-on />
          <i />
          <i />
        </span>
      )}
      {shape === "pin" && <span className={styles.fmtSave}>Save</span>}
    </span>
  );
}

export function BulletVisual({ spec }: { spec: BulletVisualSpec }) {
  switch (spec.kind) {
    case "chips":
      return (
        <div className={styles.v}>
          <span className={styles.field}>
            <Search size={15} strokeWidth={2.4} />
            <span className={styles.fieldText}>{spec.items.filter((_, i) => spec.active.includes(i)).join(" · ")}</span>
          </span>
          <span className={styles.chips}>
            {spec.items.map((item, i) => (
              <span key={item} className={styles.chip} data-on={spec.active.includes(i) || undefined} style={vars({ "--i": i })}>
                {spec.active.includes(i) && <Check size={13} strokeWidth={3} />}
                {item}
              </span>
            ))}
          </span>
        </div>
      );
    case "lifespan":
      return (
        <div className={styles.v}>
          <span className={styles.axis}>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
          </span>
          {spec.rows.map((row, i) => (
            <span key={row.label} className={styles.lane} data-live={row.live || undefined} style={vars({ "--s": row.start, "--e": row.end, "--i": i })}>
              <span className={styles.laneLabel}>{row.label}</span>
              <span className={styles.laneNote}>
                {row.live && <i className={styles.liveDot} />}
                {row.note}
              </span>
              <span className={styles.laneTrack}>
                <i />
              </span>
            </span>
          ))}
        </div>
      );
    case "source":
      return (
        <div className={styles.v} data-center>
          <MiniAd logo={spec.logo} image={spec.image} />
          <span className={styles.sourceButton}>
            <PlatformMark logo={spec.logo} className={styles.inlineLogo} />
            {spec.label}
            <ArrowUpRight size={15} strokeWidth={2.6} />
          </span>
        </div>
      );
    case "grid":
      return (
        <div className={styles.v}>
          <span className={styles.grid}>
            <span />
            <MetaLogo className={styles.gridLogo} />
            <GoogleLogo className={styles.gridLogo} />
            <TikTokLogo className={styles.gridLogo} />
            {["TOF", "MOF", "BOF"].map((stage, r) => (
              <span key={stage} className={styles.gridRow}>
                <span className={styles.gridStage}>{stage}</span>
                {GRID_TAGS[r].map((tag, c) => (
                  <span key={c} className={styles.gridCell} data-tag={tag} style={vars({ "--i": r * 3 + c })}>
                    {tag}
                  </span>
                ))}
              </span>
            ))}
          </span>
        </div>
      );
    case "summary":
      return (
        <div className={styles.v}>
          <span className={styles.panel}>
            <span className={styles.panelHead}>
              <span className={styles.spark}>
                <Sparkles size={14} strokeWidth={2.4} />
              </span>
              <b>{spec.title}</b>
            </span>
            {spec.lines.map((line, i) => (
              <span key={line} className={styles.summaryLine} style={vars({ "--i": i })}>
                <i data-i={i} />
                {line}
              </span>
            ))}
          </span>
        </div>
      );
    case "bars":
      return (
        <div className={styles.v}>
          {spec.rows.map((row, i) => (
            <span
              key={row.label}
              className={styles.bar}
              data-shift={row.was != null || undefined}
              style={vars({ "--v": row.value / 100, "--w": (row.was ?? 0) / 100, "--i": i })}
            >
              <span className={styles.barLabel}>
                {row.logo && <PlatformMark logo={row.logo} className={styles.inlineLogo} />}
                {row.label}
              </span>
              <span className={styles.barNote}>{row.note ?? `${row.value}%`}</span>
              <span className={styles.barTrack}>
                {row.was != null && <i className={styles.barWas} />}
                <i className={styles.barFill} />
              </span>
            </span>
          ))}
        </div>
      );
    case "versus":
      return (
        <div className={styles.v}>
          <span className={styles.panel}>
            <span className={styles.vsRow} data-head>
              <span />
              <b>{spec.left}</b>
              <b>{spec.right}</b>
            </span>
            {spec.rows.map((row, i) => (
              <span key={row.label} className={styles.vsRow} style={vars({ "--i": i })}>
                <span>{row.label}</span>
                <i data-on={row.left || undefined}>{row.left ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}</i>
                <i data-on={row.right || undefined}>{row.right ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}</i>
              </span>
            ))}
          </span>
        </div>
      );
    case "save":
      return (
        <div className={styles.v} data-center>
          <MiniAd logo={spec.logo ?? "meta"} image={spec.image}>
            <span className={styles.bookmark}>
              <Bookmark size={13} fill="currentColor" strokeWidth={2} />
            </span>
          </MiniAd>
          <span className={styles.toast}>
            <Check size={14} strokeWidth={3} />
            {spec.toast}
          </span>
        </div>
      );
    case "sorted":
      return (
        <div className={styles.v}>
          <span className={styles.sortHead}>
            {spec.head}
            <ChevronDown size={14} strokeWidth={2.6} />
          </span>
          {spec.rows.map((row, i) => (
            <span key={row.text} className={styles.sortRow} style={vars({ "--i": i })} data-top={i === 0 || undefined}>
              <span>{row.text}</span>
              <em>{row.note}</em>
            </span>
          ))}
        </div>
      );
    case "score":
      return (
        <div className={styles.v} data-center>
          <span className={styles.gauge} style={vars({ "--v": spec.value / 100 })}>
            <svg viewBox="0 0 120 68" aria-hidden="true">
              <defs>
                <linearGradient id="bullet-gauge" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="#9ad1ff" />
                  <stop offset="0.6" stopColor="#4a7fa5" />
                  <stop offset="1" stopColor="#2fbf71" />
                </linearGradient>
              </defs>
              <path d="M10 62 A50 50 0 0 1 110 62" className={styles.gaugeTrack} />
              <path d="M10 62 A50 50 0 0 1 110 62" className={styles.gaugeFill} pathLength={1} />
            </svg>
            <b>{spec.value}</b>
          </span>
          <span className={styles.gaugeTier}>{spec.tier}</span>
          <span className={styles.gaugeNote}>
            <Check size={13} strokeWidth={3} />
            {spec.note}
          </span>
        </div>
      );
    case "tags":
      return (
        <div className={styles.v} data-center>
          <span className={styles.tags}>
            {spec.items.map((item, i) => (
              <span key={item.label} className={styles.tag} data-size={item.size} style={vars({ "--i": i })}>
                {item.label}
              </span>
            ))}
          </span>
        </div>
      );
    case "calendar":
      return (
        <div className={styles.v}>
          <span className={styles.panel}>
            <span className={styles.panelHead}>
              <span className={styles.spark}>
                <Mail size={14} strokeWidth={2.4} />
              </span>
              <b>{spec.title}</b>
            </span>
            <span className={styles.cal}>
              {DAYS.map((day, i) => (
                <b key={i}>{day}</b>
              ))}
              {Array.from({ length: 28 }, (_, i) => (
                <i key={i} data-hit={spec.hits.includes(i) || undefined} style={vars({ "--i": i })} />
              ))}
            </span>
          </span>
        </div>
      );
    case "columns": {
      const max = Math.max(...spec.a, ...(spec.b ?? []), 1);
      return (
        <div className={styles.v}>
          <span className={styles.cols}>
            {spec.labels.map((label, i) => (
              <span key={i} className={styles.col} style={vars({ "--a": spec.a[i] / max, "--b": (spec.b?.[i] ?? 0) / max, "--i": i })}>
                <span className={styles.colBars}>
                  <i data-series="a" />
                  {spec.b && <i data-series="b" />}
                </span>
                <b>{label}</b>
              </span>
            ))}
          </span>
          {spec.legend && (
            <span className={styles.legend}>
              <span>
                <i data-series="a" />
                {spec.legend[0]}
              </span>
              <span>
                <i data-series="b" />
                {spec.legend[1]}
              </span>
            </span>
          )}
        </div>
      );
    }
    case "classify":
      return (
        <div className={styles.v}>
          {spec.rows.map((row, i) => (
            <span key={`${row.logo}-${i}`} className={styles.classRow} style={vars({ "--i": i })}>
              <PlatformMark logo={row.logo} className={styles.classLogo} />
              <span>{row.label ?? row.logo[0].toUpperCase() + row.logo.slice(1)}</span>
              <em data-tag={row.tag}>{row.tag}</em>
            </span>
          ))}
        </div>
      );
    case "alerts":
      return (
        <div className={styles.v} data-center>
          {spec.items.map((item, i) => (
            <span key={item} className={styles.alert} style={vars({ "--i": i })}>
              <span className={styles.alertIcon}>
                <BellRing size={15} strokeWidth={2.4} />
              </span>
              <span>{item}</span>
              {i === 0 && <em>New</em>}
            </span>
          ))}
        </div>
      );
    case "inbox":
      return (
        <div className={styles.v} data-center>
          <span className={styles.address}>
            <Mail size={15} strokeWidth={2.4} />
            <span>{spec.address}</span>
            <Copy size={14} strokeWidth={2.4} />
          </span>
          <span className={styles.mail}>
            <span className={styles.mailAvatar}>{spec.from.slice(0, 1)}</span>
            <span className={styles.mailText}>
              <b>{spec.from}</b>
              <span>{spec.subject}</span>
            </span>
            <em>New</em>
          </span>
        </div>
      );
    case "formats":
      return (
        <div className={styles.v} data-center>
          <span className={styles.formats}>
            {spec.items.map((item, i) => (
              <span key={item.label} className={styles.format} style={vars({ "--i": i })}>
                <FormatTile shape={item.shape} image={item.image} />
                <b>{item.label}</b>
              </span>
            ))}
          </span>
        </div>
      );
    case "search":
      return (
        <div className={styles.v} data-center>
          <span className={styles.field} data-big>
            <Search size={16} strokeWidth={2.4} />
            <span className={styles.typed}>{spec.query}</span>
            <i className={styles.caret} />
          </span>
          <span className={styles.result}>
            <span className={styles.resultLogo}>
              <PlatformMark logo={spec.logo} className={styles.inlineLogo} />
            </span>
            <span className={styles.mailText}>
              <b>{spec.name}</b>
              <span>{spec.sub}</span>
            </span>
            <em>Track</em>
          </span>
        </div>
      );
    case "checklist":
      return (
        <div className={styles.v}>
          <span className={styles.panel}>
            <span className={styles.panelHead}>
              <span className={styles.rivalMark}>
                <RivalLogoImg />
              </span>
              <b>{spec.title}</b>
            </span>
            {spec.rows.map((row, i) => (
              <span key={row.label} className={styles.checkRow} style={vars({ "--i": i })}>
                <PlatformMark logo={row.logo} className={styles.inlineLogo} />
                {row.label}
                <Check size={14} strokeWidth={3} />
              </span>
            ))}
          </span>
        </div>
      );
  }
}
