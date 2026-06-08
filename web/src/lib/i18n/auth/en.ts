import type { AuthCopy } from "@/lib/i18n/auth/types";

export const authCopyEn: AuthCopy = {
  signup: {
    localeSwitcherAria: "Choose language",
    homeAria: "Rival home",
    pageTitle: "Create account",
    title: "Create your account",
    subtitle: "Enter your email and choose a password.",
    emailLabel: "Email address",
    emailPlaceholder: "yourstore@example.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Choose a password",
    confirmPasswordLabel: "Confirm password",
    confirmPasswordPlaceholder: "Confirm your password",
    submit: "Create account",
    submitting: "Creating account…",
    dividerOr: "or",
    google: "Continue with Google",
    googleOpening: "Opening Google…",
    alreadyHaveAccount: "Already have an account?",
    signIn: "Sign in",
    success: {
      confirmEmail:
        "Check your inbox for a confirmation email from us. Open the link to finish signup, then you can sign in.",
    },
    errors: {
      emailRequired: "Enter your email address first.",
      passwordRequired: "Choose a password.",
      passwordsMismatch: "Passwords don't match",
      signupFailed: "Could not complete signup.",
      validEmailRequired: "Please enter a valid email address.",
      passwordRequiredApi: "Please choose a password.",
      emailSendFailed: "Could not send confirmation email. Try again in a moment.",
    },
    confirmationEmail: {
      subject: "Confirm your Rival signup",
      text: "Confirm your email to finish creating your account (link expires soon):\n\n{url}\n",
      htmlIntro:
        "Confirm your email to finish creating your Spy Rival account. This link expires shortly.",
      htmlButton: "Confirm your email",
      htmlIgnore: "If you did not sign up for Rival, you can ignore this email.",
    },
    devPanel: {
      title: "Local dev — no email",
      body: "Sign in instantly (uses service role). Confirmation links from signup also stay on localhost while you develop here.",
      continueWithoutEmail: "Continue without email (localhost)",
      signingIn: "Signing in…",
      emailRequired: "Enter your email above first.",
      instantFailed: "Instant sign-in failed",
      endpointFailed: "Could not reach dev sign-in endpoint",
      testOnboarding: "Test onboarding:",
    },
  },
};
