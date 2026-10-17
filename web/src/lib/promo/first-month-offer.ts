import type { Locale } from "@/lib/i18n/locale";

/**
 * The landing's surprise offer: a city-tagged top bar with a short countdown, and a scratch card
 * popup that emails the code. RIVAL50 must exist in Polar as a 50%-off-first-month discount code,
 * or checkout will reject it.
 */
export const FIRST_MONTH_OFFER = {
  code: "RIVAL50",
  percentOff: 50,
  /** Length of the top-bar countdown; at zero the visitor is offered more time. */
  timerMinutes: 24 * 60,
  /** The scratch card opens once the visitor has scrolled this share of the landing, once a day. */
  popupScrollShare: 0.25,
} as const;

type OfferCopy = {
  bar: {
    /** Templates: `{city}`, `{percent}` */
    withCity: string;
    /** Template: `{percent}` */
    noCity: string;
    claim: string;
    timerLabel: string;
    /** Template: `{minutes}` */
    expired: string;
    extend: string;
    /** Template: `{code}` */
    codeReady: string;
  };
  /** Pill fixed to the bottom of the page; it links to /pricing (from /pricing, to sign-up). */
  sticky: {
    /** Template: `{percent}` */
    redeem: string;
    /** Template: `{code}` */
    codeReady: string;
  };
  popup: {
    dialogLabel: string;
    title: string;
    scratchHere: string;
    revealWithoutScratching: string;
    unlocked: string;
    /** Template: `{percent}` */
    unlockedSub: string;
    claim: string;
    emailTitle: string;
    emailSub: string;
    emailPlaceholder: string;
    send: string;
    sending: string;
    invalidEmail: string;
    failed: string;
    doneTitle: string;
    /** Template: `{email}` */
    doneSub: string;
    copy: string;
    copied: string;
    startTrial: string;
    close: string;
  };
  email: {
    /** Templates: `{percent}`, `{code}` */
    subject: string;
    /** Template: `{percent}` */
    heading: string;
    body: string;
    cta: string;
    footer: string;
  };
};

const COPY: Record<Locale, OfferCopy> = {
  en: {
    bar: {
      withCity: "Black Friday special: {percent}% off your first month",
      noCity: "Black Friday special: {percent}% off your first month",
      claim: "Claim",
      timerLabel: "Offer timer",
      expired: "Time's up! Want another 24 hours?",
      extend: "Extend",
      codeReady: "Your code {code} is ready",
    },
    sticky: {
      redeem: "Redeem {percent}% OFF",
      codeReady: "Your code: {code}",
    },
    popup: {
      dialogLabel: "Your surprise discount",
      title: "You've got a surprise!",
      scratchHere: "SCRATCH HERE",
      revealWithoutScratching: "Reveal without scratching",
      unlocked: "DISCOUNT UNLOCKED!",
      unlockedSub: "{percent}% off your first month of Rival",
      claim: "Claim",
      emailTitle: "Where do we send it?",
      emailSub: "Enter your email to get your code",
      emailPlaceholder: "Enter your email",
      send: "Send code",
      sending: "Sending…",
      invalidEmail: "Please enter a valid email.",
      failed: "Couldn't send it. Try again in a minute.",
      doneTitle: "Check your inbox!",
      doneSub: "We sent your code to {email}. Use it at checkout.",
      copy: "Copy",
      copied: "Copied!",
      startTrial: "Get started",
      close: "Close",
    },
    email: {
      subject: "Your {percent}% off code for Rival: {code}",
      heading: "Your {percent}% off is unlocked",
      body: "Enter this code at checkout to get it on your first month of Rival.",
      cta: "Get started",
      footer: "You're getting this because you asked for your Rival discount code.",
    },
  },
  de: {
    bar: {
      withCity: "Black-Friday-Special: {percent} % Rabatt auf den ersten Monat",
      noCity: "Black-Friday-Special: {percent} % Rabatt auf den ersten Monat",
      claim: "Sichern",
      timerLabel: "Angebots-Timer",
      expired: "Zeit abgelaufen! Noch einmal 24 Stunden?",
      extend: "Verlängern",
      codeReady: "Dein Code {code} ist bereit",
    },
    sticky: {
      redeem: "{percent} % Rabatt einlösen",
      codeReady: "Dein Code: {code}",
    },
    popup: {
      dialogLabel: "Dein Überraschungsrabatt",
      title: "Du hast eine Überraschung!",
      scratchHere: "HIER RUBBELN",
      revealWithoutScratching: "Ohne Rubbeln aufdecken",
      unlocked: "RABATT FREIGESCHALTET!",
      unlockedSub: "{percent} % Rabatt auf deinen ersten Monat Rival",
      claim: "Sichern",
      emailTitle: "Wohin dürfen wir ihn schicken?",
      emailSub: "Gib deine E-Mail ein, um deinen Code zu erhalten",
      emailPlaceholder: "Deine E-Mail",
      send: "Code senden",
      sending: "Wird gesendet …",
      invalidEmail: "Bitte gib eine gültige E-Mail ein.",
      failed: "Senden fehlgeschlagen. Versuch es gleich noch einmal.",
      doneTitle: "Schau in dein Postfach!",
      doneSub: "Wir haben deinen Code an {email} gesendet. Gib ihn beim Bezahlen ein.",
      copy: "Kopieren",
      copied: "Kopiert!",
      startTrial: "Jetzt starten",
      close: "Schließen",
    },
    email: {
      subject: "Dein {percent} %-Rabattcode für Rival: {code}",
      heading: "Dein Rabatt von {percent} % ist freigeschaltet",
      body: "Gib diesen Code beim Bezahlen ein, um ihn auf deinen ersten Monat Rival zu erhalten.",
      cta: "Jetzt starten",
      footer: "Du erhältst diese E-Mail, weil du deinen Rival-Rabattcode angefordert hast.",
    },
  },
  nl: {
    bar: {
      withCity: "Black Friday-special: {percent}% korting op je eerste maand",
      noCity: "Black Friday-special: {percent}% korting op je eerste maand",
      claim: "Claim",
      timerLabel: "Aanbiedingstimer",
      expired: "Tijd is om! Nog eens 24 uur?",
      extend: "Verlengen",
      codeReady: "Je code {code} staat klaar",
    },
    sticky: {
      redeem: "{percent}% korting verzilveren",
      codeReady: "Je code: {code}",
    },
    popup: {
      dialogLabel: "Je verrassingskorting",
      title: "Je hebt een verrassing!",
      scratchHere: "KRAS HIER",
      revealWithoutScratching: "Onthullen zonder krassen",
      unlocked: "KORTING ONTGRENDELD!",
      unlockedSub: "{percent}% korting op je eerste maand Rival",
      claim: "Claim",
      emailTitle: "Waar sturen we hem heen?",
      emailSub: "Vul je e-mail in om je code te krijgen",
      emailPlaceholder: "Je e-mailadres",
      send: "Code versturen",
      sending: "Versturen…",
      invalidEmail: "Vul een geldig e-mailadres in.",
      failed: "Versturen mislukt. Probeer het zo opnieuw.",
      doneTitle: "Check je inbox!",
      doneSub: "We hebben je code naar {email} gestuurd. Gebruik hem bij het afrekenen.",
      copy: "Kopiëren",
      copied: "Gekopieerd!",
      startTrial: "Aan de slag",
      close: "Sluiten",
    },
    email: {
      subject: "Je {percent}%-kortingscode voor Rival: {code}",
      heading: "Je {percent}% korting is ontgrendeld",
      body: "Vul deze code in bij het afrekenen voor korting op je eerste maand Rival.",
      cta: "Aan de slag",
      footer: "Je krijgt deze e-mail omdat je je Rival-kortingscode hebt aangevraagd.",
    },
  },
};

export function firstMonthOfferCopy(locale: Locale): OfferCopy {
  return COPY[locale] ?? COPY.en;
}

export function fillOffer(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    values[key] == null ? match : String(values[key]),
  );
}
