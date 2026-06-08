import type { AuthCopy } from "@/lib/i18n/auth/types";

export const authCopyDe: AuthCopy = {
  signup: {
    localeSwitcherAria: "Sprache wählen",
    homeAria: "Rival Startseite",
    pageTitle: "Konto erstellen",
    title: "Konto erstellen",
    subtitle: "E-Mail eingeben und Passwort wählen.",
    emailLabel: "E-Mail-Adresse",
    emailPlaceholder: "shop@beispiel.de",
    passwordLabel: "Passwort",
    passwordPlaceholder: "Passwort wählen",
    confirmPasswordLabel: "Passwort bestätigen",
    confirmPasswordPlaceholder: "Passwort erneut eingeben",
    submit: "Konto erstellen",
    submitting: "Konto wird erstellt…",
    dividerOr: "oder",
    google: "Mit Google fortfahren",
    googleOpening: "Google wird geöffnet…",
    alreadyHaveAccount: "Bereits ein Konto?",
    signIn: "Anmelden",
    success: {
      confirmEmail:
        "Prüfen Sie Ihren Posteingang auf unsere Bestätigungs-E-Mail. Öffnen Sie den Link, um die Registrierung abzuschließen, und melden Sie sich dann an.",
    },
    errors: {
      emailRequired: "Bitte zuerst Ihre E-Mail-Adresse eingeben.",
      passwordRequired: "Bitte ein Passwort wählen.",
      passwordsMismatch: "Passwörter stimmen nicht überein",
      signupFailed: "Registrierung konnte nicht abgeschlossen werden.",
      validEmailRequired: "Bitte eine gültige E-Mail-Adresse eingeben.",
      passwordRequiredApi: "Bitte ein Passwort wählen.",
      emailSendFailed: "Bestätigungs-E-Mail konnte nicht gesendet werden. Bitte später erneut versuchen.",
    },
    confirmationEmail: {
      subject: "Rival-Registrierung bestätigen",
      text: "Bestätigen Sie Ihre E-Mail, um die Kontoerstellung abzuschließen (Link läuft bald ab):\n\n{url}\n",
      htmlIntro:
        "Bestätigen Sie Ihre E-Mail, um Ihr Spy-Rival-Konto fertigzustellen. Dieser Link läuft in Kürze ab.",
      htmlButton: "E-Mail bestätigen",
      htmlIgnore: "Wenn Sie sich nicht bei Rival registriert haben, können Sie diese E-Mail ignorieren.",
    },
    devPanel: {
      title: "Lokale Entwicklung — keine E-Mail",
      body: "Sofort anmelden (Service Role). Bestätigungslinks vom Signup bleiben lokal auf localhost.",
      continueWithoutEmail: "Ohne E-Mail fortfahren (localhost)",
      signingIn: "Anmeldung…",
      emailRequired: "Bitte zuerst oben eine E-Mail eingeben.",
      instantFailed: "Sofort-Anmeldung fehlgeschlagen",
      endpointFailed: "Dev-Anmelde-Endpunkt nicht erreichbar",
      testOnboarding: "Onboarding testen:",
    },
  },
};
