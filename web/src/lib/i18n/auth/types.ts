export type SignupConfirmationEmailCopy = {
  subject: string;
  /** Plain-text body; `{url}` placeholder */
  text: string;
  htmlIntro: string;
  htmlButton: string;
  htmlIgnore: string;
};

export type SignupCopy = {
  localeSwitcherAria: string;
  homeAria: string;
  pageTitle: string;
  title: string;
  subtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  submit: string;
  submitting: string;
  dividerOr: string;
  google: string;
  googleOpening: string;
  alreadyHaveAccount: string;
  signIn: string;
  success: {
    confirmEmail: string;
  };
  errors: {
    emailRequired: string;
    passwordRequired: string;
    passwordsMismatch: string;
    signupFailed: string;
    validEmailRequired: string;
    passwordRequiredApi: string;
    emailSendFailed: string;
  };
  confirmationEmail: SignupConfirmationEmailCopy;
  devPanel: {
    title: string;
    body: string;
    continueWithoutEmail: string;
    signingIn: string;
    emailRequired: string;
    instantFailed: string;
    endpointFailed: string;
    testOnboarding: string;
  };
};

export type AuthCopy = {
  signup: SignupCopy;
};
