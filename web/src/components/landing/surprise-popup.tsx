"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ArrowUpRight, Check, Copy, MailCheck, X } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { FIRST_MONTH_OFFER, fillOffer, firstMonthOfferCopy } from "@/lib/promo/first-month-offer";
import { prefersReducedMotion } from "./editorial-tilt";
import styles from "./promo-offer.module.css";

type Step = "scratch" | "unlocked" | "email" | "done";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Share of the card that must be scratched before it clears itself. */
const REVEAL_AT = 0.45;
const GRID_COLS = 36;
const GRID_ROWS = 22;
const BRUSH = 28;
/** Brand blues plus a few party colours, saturated enough to read on the pale overlay. */
const CONFETTI_COLORS = ["#4a7fa5", "#365c75", "#6fb6ec", "#ffd36e", "#ff8fa3", "#7fd1b9", "#b9a6ff", "#9ad1ff"];
const spring = { type: "spring" as const, stiffness: 170, damping: 22, mass: 0.9 };

const noopSubscribe = () => () => {};

/** Ribbons, squares and dots thrown up from a point and falling under gravity. */
function confettiCannon(x: number, y: number, count = 90) {
  if (prefersReducedMotion()) return;
  const layer = document.createElement("div");
  layer.className = styles.confettiLayer;
  document.body.appendChild(layer);
  let finished = 0;
  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement("i");
    const shape = i % 3;
    piece.className = styles.confetti;
    piece.dataset.shape = shape === 0 ? "ribbon" : shape === 1 ? "square" : "dot";
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    layer.appendChild(piece);
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.15;
    const power = 260 + Math.random() * 360;
    const dx = Math.cos(angle) * power;
    const dy = Math.sin(angle) * power;
    const spin = (Math.random() - 0.5) * 1440;
    const fall = 560 + Math.random() * 280;
    // Each leg gets its own curve: a fast throw that slows at the top, then gravity. One curve
    // over the whole flight would rush the pieces through their fade.
    piece.animate(
      [
        {
          transform: "translate(-50%, -50%) rotate(0deg) scale(0.6)",
          opacity: 1,
          easing: "cubic-bezier(0.18, 0.8, 0.32, 1)",
        },
        {
          transform: `translate(calc(-50% + ${dx * 0.8}px), calc(-50% + ${dy}px)) rotate(${spin * 0.4}deg) scale(1)`,
          opacity: 1,
          offset: 0.32,
          easing: "cubic-bezier(0.42, 0, 0.78, 0.7)",
        },
        {
          transform: `translate(calc(-50% + ${dx * 1.02}px), calc(-50% + ${dy + fall * 0.7}px)) rotate(${spin * 0.85}deg) scale(1)`,
          opacity: 1,
          offset: 0.78,
        },
        {
          transform: `translate(calc(-50% + ${dx * 1.1}px), calc(-50% + ${dy + fall}px)) rotate(${spin}deg) scale(0.9)`,
          opacity: 0,
        },
      ],
      {
        duration: 2300 + Math.random() * 900,
        delay: Math.random() * 120,
        fill: "both",
      },
    ).onfinish = () => {
      finished += 1;
      if (finished === count) layer.remove();
    };
  }
}

function confettiFrom(node: Element | null) {
  if (!node) return;
  const rect = node.getBoundingClientRect();
  confettiCannon(rect.left + rect.width / 2, rect.top + rect.height / 2);
}

/** Draws the scratch cover: deep steel to sky, soft blobs, a dashed edge and the label. */
function paintCover(canvas: HTMLCanvasElement, label: string) {
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  if (!w || !h) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  const base = ctx.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, "#284b63");
  base.addColorStop(0.45, "#4a7fa5");
  base.addColorStop(1, "#8fc3ea");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const blobs: Array<[number, number, number, string]> = [
    [0.18, 0.55, 0.32, "rgba(221, 241, 253, 0.45)"],
    [0.52, 0.42, 0.28, "rgba(255, 244, 203, 0.32)"],
    [0.82, 0.62, 0.34, "rgba(221, 241, 253, 0.4)"],
  ];
  for (const [bx, by, br, color] of blobs) {
    const glow = ctx.createRadialGradient(bx * w, by * h, 0, bx * w, by * h, br * w);
    glow.addColorStop(0, color);
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.setLineDash([12, 9]);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.beginPath();
  ctx.roundRect(14, 14, w - 28, h - 28, 14);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(Math.min(40, w / 11))}px Inter, Arial, sans-serif`;
  ctx.shadowColor = "rgba(15, 30, 45, 0.25)";
  ctx.shadowBlur = 12;
  ctx.fillText(label, w / 2, h / 2);
  ctx.shadowBlur = 0;
}

function ScratchCard({
  label,
  revealLabel,
  unlocked,
  unlockedSub,
  revealed,
  onReveal,
}: {
  label: string;
  revealLabel: string;
  unlocked: string;
  unlockedSub: string;
  revealed: boolean;
  onReveal: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const scratch = useRef({ active: false, x: 0, y: 0, cells: new Uint8Array(GRID_COLS * GRID_ROWS), cleared: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    paintCover(canvas, label);
    document.fonts?.ready.then(() => {
      if (scratch.current.cleared === 0) paintCover(canvas, label);
    });
  }, [label]);

  const mark = (x: number, y: number, width: number, height: number) => {
    const s = scratch.current;
    const cellW = width / GRID_COLS;
    const cellH = height / GRID_ROWS;
    const reachX = Math.ceil(BRUSH / cellW);
    const reachY = Math.ceil(BRUSH / cellH);
    const cx = Math.floor(x / cellW);
    const cy = Math.floor(y / cellH);
    for (let gy = cy - reachY; gy <= cy + reachY; gy += 1) {
      for (let gx = cx - reachX; gx <= cx + reachX; gx += 1) {
        if (gx < 0 || gy < 0 || gx >= GRID_COLS || gy >= GRID_ROWS) continue;
        const px = (gx + 0.5) * cellW - x;
        const py = (gy + 0.5) * cellH - y;
        const index = gy * GRID_COLS + gx;
        if (px * px + py * py <= BRUSH * BRUSH && !s.cells[index]) {
          s.cells[index] = 1;
          s.cleared += 1;
        }
      }
    }
  };

  const scratchTo = (event: ReactPointerEvent<HTMLCanvasElement>, start: boolean) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || revealed) return;
    const rect = canvas.getBoundingClientRect();
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const x = ((event.clientX - rect.left) * width) / rect.width;
    const y = ((event.clientY - rect.top) * height) / rect.height;
    const s = scratch.current;
    const fromX = start ? x : s.x;
    const fromY = start ? y : s.y;
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = BRUSH * 2;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(x + 0.01, y);
    ctx.stroke();
    const steps = Math.max(1, Math.ceil(Math.hypot(x - fromX, y - fromY) / 8));
    for (let i = 1; i <= steps; i += 1) {
      mark(fromX + ((x - fromX) * i) / steps, fromY + ((y - fromY) * i) / steps, width, height);
    }
    s.x = x;
    s.y = y;
    if (s.cleared / s.cells.length >= REVEAL_AT) onReveal();
  };

  return (
    <div ref={cardRef} className={styles.scratchCard} data-revealed={revealed || undefined}>
      <div className={styles.prize}>
        <p className={styles.unlocked}>{unlocked}</p>
        <p className={styles.unlockedSub}>{unlockedSub}</p>
      </div>
      <canvas
        ref={canvasRef}
        className={styles.cover}
        aria-hidden="true"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          scratch.current.active = true;
          cardRef.current?.setAttribute("data-scratching", "true");
          scratchTo(event, true);
        }}
        onPointerMove={(event) => {
          if (scratch.current.active) scratchTo(event, false);
        }}
        onPointerUp={() => {
          scratch.current.active = false;
          cardRef.current?.removeAttribute("data-scratching");
        }}
        onPointerCancel={() => {
          scratch.current.active = false;
          cardRef.current?.removeAttribute("data-scratching");
        }}
      />
      {!revealed && (
        <button type="button" className={styles.revealButton} onClick={onReveal}>
          {revealLabel}
        </button>
      )}
    </div>
  );
}

export function SurprisePopup({
  open,
  claimed,
  locale,
  onClose,
  onClaimed,
}: {
  open: boolean;
  claimed: boolean;
  locale: Locale;
  onClose: () => void;
  onClaimed: () => void;
}) {
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!isClient) return null;
  return createPortal(
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open && (
          <SurpriseDialog
            key="surprise"
            claimed={claimed}
            locale={locale}
            onClose={onClose}
            onClaimed={onClaimed}
          />
        )}
      </AnimatePresence>
    </MotionConfig>,
    document.body,
  );
}

function SurpriseDialog({
  claimed,
  locale,
  onClose,
  onClaimed,
}: {
  claimed: boolean;
  locale: Locale;
  onClose: () => void;
  onClaimed: () => void;
}) {
  const copy = firstMonthOfferCopy(locale).popup;
  const [step, setStep] = useState<Step>(claimed ? "done" : "scratch");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const prizeRef = useRef<HTMLDivElement>(null);
  const revealedRef = useRef(false);
  const percent = FIRST_MONTH_OFFER.percentOff;

  // Lock the page behind, keep Tab inside, close on Escape, and hand focus back on close.
  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    dialog?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>("button, a[href], input, [tabindex]:not([tabindex='-1'])"),
      ).filter((node) => !node.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      root.style.overflow = previousOverflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  const reveal = () => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    setStep("unlocked");
    navigator.vibrate?.(35);
    requestAnimationFrame(() => confettiFrom(prizeRef.current));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError(copy.invalidEmail);
      return;
    }
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/promo/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, locale }),
      });
      if (response.status === 400) {
        setError(copy.invalidEmail);
        return;
      }
      if (!response.ok) {
        setError(copy.failed);
        return;
      }
      setSentTo(value);
      setStep("done");
      onClaimed();
      requestAnimationFrame(() => confettiCannon(window.innerWidth / 2, window.innerHeight * 0.42, 70));
    } catch {
      setError(copy.failed);
    } finally {
      setSending(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(FIRST_MONTH_OFFER.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked; the code stays visible to copy by hand.
    }
  };

  const stageMotion = {
    initial: { opacity: 0, y: 28, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -18, scale: 0.98 },
    transition: spring,
  };

  return (
    <motion.div
      ref={dialogRef}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={copy.dialogLabel}
      tabIndex={-1}
      data-lenis-prevent
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <button type="button" className={styles.close} onClick={onClose} aria-label={copy.close}>
        <X size={22} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <AnimatePresence mode="wait">
        {(step === "scratch" || step === "unlocked") && (
          <motion.div key="scratch" className={styles.stage} {...stageMotion}>
            <h2 className={styles.title}>{copy.title}</h2>
            <div className={styles.float} ref={prizeRef}>
              <ScratchCard
                label={copy.scratchHere}
                revealLabel={copy.revealWithoutScratching}
                unlocked={copy.unlocked}
                unlockedSub={fillOffer(copy.unlockedSub, { percent })}
                revealed={step === "unlocked"}
                onReveal={reveal}
              />
            </div>
            <div className={styles.actionSlot}>
              <AnimatePresence>
                {step === "unlocked" && (
                  <motion.button
                    key="claim"
                    type="button"
                    className={styles.primary}
                    onClick={() => setStep("email")}
                    initial={{ opacity: 0, y: 22, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ ...spring, delay: 0.35 }}
                  >
                    <span>{copy.claim}</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
        {step === "email" && (
          <motion.form key="email" className={styles.stage} onSubmit={submit} noValidate {...stageMotion}>
            <h2 className={styles.title}>{copy.emailTitle}</h2>
            <div className={styles.float}>
              <div className={styles.formCard}>
                <p className={styles.formSub}>{copy.emailSub}</p>
                <input
                  className={styles.input}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  placeholder={copy.emailPlaceholder}
                  aria-label={copy.emailPlaceholder}
                  aria-invalid={error ? true : undefined}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError("");
                  }}
                />
                <p className={styles.error} role="alert">
                  {error}
                </p>
              </div>
            </div>
            <div className={styles.actionSlot}>
              <button type="submit" className={styles.primary} disabled={sending}>
                <span>{sending ? copy.sending : copy.send}</span>
              </button>
            </div>
          </motion.form>
        )}
        {step === "done" && (
          <motion.div key="done" className={styles.stage} {...stageMotion}>
            <h2 className={styles.title}>{copy.doneTitle}</h2>
            <div className={styles.float}>
              <div className={styles.formCard}>
                <span className={styles.doneIcon} aria-hidden="true">
                  <MailCheck size={26} strokeWidth={2} />
                </span>
                {sentTo && <p className={styles.formSub}>{fillOffer(copy.doneSub, { email: sentTo })}</p>}
                <div className={styles.codeRow}>
                  <span className={styles.code}>{FIRST_MONTH_OFFER.code}</span>
                  <button type="button" className={styles.copy} onClick={copyCode}>
                    {copied ? <Check size={16} strokeWidth={2.4} aria-hidden="true" /> : <Copy size={16} strokeWidth={2.2} aria-hidden="true" />}
                    {copied ? copy.copied : copy.copy}
                  </button>
                </div>
              </div>
            </div>
            <div className={styles.actionSlot}>
              <Link href="/signup" className={styles.primary} onClick={onClose}>
                <span>{copy.startTrial}</span>
                <ArrowUpRight size={20} strokeWidth={2.2} aria-hidden="true" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
