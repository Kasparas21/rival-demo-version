import type { AuthCopy } from "@/lib/i18n/auth/types";

export const authCopyNl: AuthCopy = {
  signup: {
    localeSwitcherAria: "Taal kiezen",
    homeAria: "Rival startpagina",
    pageTitle: "Account aanmaken",
    title: "Account aanmaken",
    subtitle: "Voer uw e-mail in en kies een wachtwoord.",
    emailLabel: "E-mailadres",
    emailPlaceholder: "winkel@voorbeeld.nl",
    passwordLabel: "Wachtwoord",
    passwordPlaceholder: "Kies een wachtwoord",
    confirmPasswordLabel: "Bevestig wachtwoord",
    confirmPasswordPlaceholder: "Herhaal uw wachtwoord",
    submit: "Account aanmaken",
    submitting: "Account aanmaken…",
    dividerOr: "of",
    google: "Doorgaan met Google",
    googleOpening: "Google openen…",
    alreadyHaveAccount: "Heeft u al een account?",
    signIn: "Inloggen",
    success: {
      confirmEmail:
        "Controleer uw inbox op onze bevestigingsmail. Open de link om de registratie af te ronden en log daarna in.",
    },
    errors: {
      emailRequired: "Voer eerst uw e-mailadres in.",
      passwordRequired: "Kies een wachtwoord.",
      passwordsMismatch: "Wachtwoorden komen niet overeen",
      signupFailed: "Registratie kon niet worden voltooid.",
      validEmailRequired: "Voer een geldig e-mailadres in.",
      passwordRequiredApi: "Kies een wachtwoord.",
      emailSendFailed: "Bevestigingsmail kon niet worden verzonden. Probeer het later opnieuw.",
    },
    confirmationEmail: {
      subject: "Bevestig uw Rival-registratie",
      text: "Bevestig uw e-mail om uw account aan te maken (link verloopt binnenkort):\n\n{url}\n",
      htmlIntro:
        "Bevestig uw e-mail om uw Spy Rival-account af te ronden. Deze link verloopt binnenkort.",
      htmlButton: "E-mail bevestigen",
      htmlIgnore: "Als u zich niet bij Rival heeft geregistreerd, kunt u deze e-mail negeren.",
    },
    devPanel: {
      title: "Lokale ontwikkeling — geen e-mail",
      body: "Direct inloggen (service role). Bevestigingslinks van signup blijven op localhost tijdens lokaal ontwikkelen.",
      continueWithoutEmail: "Doorgaan zonder e-mail (localhost)",
      signingIn: "Inloggen…",
      emailRequired: "Voer eerst hierboven een e-mail in.",
      instantFailed: "Direct inloggen mislukt",
      endpointFailed: "Dev-inlogendpoint niet bereikbaar",
      testOnboarding: "Onboarding testen:",
    },
  },
};
