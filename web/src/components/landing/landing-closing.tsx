"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { CSSProperties, FormEvent } from "react";
import { ArrowRight, BadgeCheck, Globe, Star } from "lucide-react";
import type { LandingShowcaseCopy } from "@/lib/i18n/landing/showcase";
import type { LandingCopy, LandingReview } from "@/lib/i18n/landing/types";
import { Reveal } from "./editorial-motion";
import styles from "./landing-closing.module.css";

function fill(template: string, name: string) {
  return template.replace("{name}", name);
}

/** Faces, five Trustpilot-style green stars (partly filled for a 4.5) and "4.5/5 from 400+ marketers". */
export function RatingPill({ copy }: { copy: LandingCopy["reviews"] }) {
  const proof = copy.socialProof;
  const faces = copy.items.filter((review) => review.photo).slice(0, 4);
  const value = Number.parseFloat(proof.score.replace(",", ".")) || 5;
  return (
    <span className={styles.rating}>
      <span className={styles.faces}>
        {faces.map((review) => (
          <Image key={review.name} src={review.photo!} alt="" width={32} height={32} />
        ))}
      </span>
      <span className={styles.stars} role="img" aria-label={proof.trustpilotAria}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={styles.star} style={{ "--f": Math.min(1, Math.max(0, value - i)) } as CSSProperties}>
            <Star size={13} fill="currentColor" strokeWidth={0} />
          </span>
        ))}
      </span>
      <span className={styles.ratingText}>
        {proof.scoreLine.split(/(\{score\}|\{count\})/).map((part, i) =>
          part === "{score}" ? <b key={i}>{proof.score}</b> : part === "{count}" ? <b key={i}>{proof.count}</b> : part,
        )}
      </span>
    </span>
  );
}

function ReviewCard({ review, copy, delay }: { review: LandingReview; copy: LandingCopy["reviews"]; delay: number }) {
  return (
    <Reveal className={styles.reviewCell} delay={delay} amount={0.2}>
      <figure className={styles.review} data-size={review.cardSize ?? "default"} data-peek={review.peek || undefined}>
        <span className={styles.reviewStars} aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} size={15} fill="currentColor" strokeWidth={0} />
          ))}
        </span>
        <blockquote className={styles.reviewText}>“{review.text}”</blockquote>
        {review.featureImage && (
          <span className={styles.reviewShot}>
            <Image
              src={review.featureImage}
              alt={review.featureImageAlt ?? fill(copy.featureImageAlt, review.name)}
              fill
              sizes="(max-width: 900px) 90vw, 360px"
            />
          </span>
        )}
        <figcaption className={styles.reviewer}>
          {review.photo ? (
            <Image src={review.photo} alt={fill(copy.photoAlt, review.name)} width={44} height={44} />
          ) : (
            <span className={styles.initials}>{review.initials ?? review.name.slice(0, 1)}</span>
          )}
          <span>
            <b>
              {review.name}
              {review.verified && <BadgeCheck size={15} strokeWidth={2.4} aria-label="Verified" />}
            </b>
            <small>{review.meta}</small>
          </span>
        </figcaption>
      </figure>
    </Reveal>
  );
}

/** A blank review-shaped card that fades into the background, so the wall reads as endless. */
function GhostCard({ tall = false }: { tall?: boolean }) {
  return (
    <span className={styles.ghost} data-tall={tall || undefined} aria-hidden="true">
      <span className={styles.ghostStars}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
        ))}
      </span>
      <i />
      <i />
      <i data-short />
      {tall && <span className={styles.ghostShot} />}
      <span className={styles.ghostPerson}>
        <b />
        <i />
      </span>
    </span>
  );
}

function GhostColumn({ side }: { side: "left" | "right" }) {
  return (
    <div className={styles.column} data-ghost={side} aria-hidden="true">
      <GhostCard tall={side === "left"} />
      <GhostCard tall={side === "right"} />
      <GhostCard />
    </div>
  );
}

export function Reviews({ copy, title }: { copy: LandingCopy["reviews"]; title: string }) {
  const [first, second, third, fourth] = copy.items;
  const columns = [[first], [second, fourth], [third]].map((column) => column.filter(Boolean));
  return (
    <section className={styles.reviews} id="reviews">
      <div className={styles.reviewsHead}>
        <Reveal amount={0.5}>
          <RatingPill copy={copy} />
        </Reveal>
        <Reveal amount={0.5} delay={150}>
          <h2 className={styles.reviewsTitle}>{title}</h2>
        </Reveal>
      </div>
      <div className={styles.wall}>
        <div className={styles.columns}>
          <GhostColumn side="left" />
          {columns.map((column, c) => (
            <div key={c} className={styles.column} data-col={c}>
              {column.map((review, r) => (
                <ReviewCard key={review.name} review={review} copy={copy} delay={120 + c * 120 + r * 120} />
              ))}
              <GhostCard tall={c !== 1} />
            </div>
          ))}
          <GhostColumn side="right" />
        </div>
      </div>
    </section>
  );
}

const CURSOR_TONES = ["sky", "pink", "butter", "lilac"] as const;

export function GetStarted({ copy, href }: { copy: LandingShowcaseCopy; href: string }) {
  const router = useRouter();
  const g = copy.getStarted;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(href);
  };
  return (
    <section className={styles.getStarted}>
      <span className={styles.halo} aria-hidden="true" />
      <Reveal amount={0.4}>
        <h2 className={styles.startTitle}>{g.title}</h2>
      </Reveal>
      <Reveal amount={0.3} delay={150} className={styles.formCell}>
        <form className={styles.form} onSubmit={submit}>
          <Globe className={styles.formIcon} size={20} strokeWidth={2.2} aria-hidden="true" />
          <input
            className={styles.input}
            type="text"
            inputMode="url"
            autoComplete="off"
            placeholder={g.placeholder}
            aria-label={g.placeholder}
          />
          <button
            type="submit"
            className={styles.submit}
          >
            <span className={styles.submitEdge} aria-hidden="true" />
            <span className={styles.submitFill} aria-hidden="true" />
            <span className={styles.submitLabel}>{g.cta}</span>
            <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </form>
        {g.tags.map((tag, i) => (
          <span
            key={tag}
            className={styles.cursor}
            data-i={i}
            data-tone={CURSOR_TONES[i]}
            style={{ "--i": i } as CSSProperties}
            aria-hidden="true"
            data-motion-loop
          >
            <svg viewBox="0 0 16 16" className={styles.pointer}>
              <path d="M2 1.5 14 7l-5.2 1.6L6.6 14z" />
            </svg>
            <span>{tag}</span>
          </span>
        ))}
      </Reveal>
    </section>
  );
}
