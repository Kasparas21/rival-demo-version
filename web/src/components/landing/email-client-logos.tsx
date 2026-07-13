const svgClass = "h-full w-full object-contain";

const EMAIL_CLIENT_ICON_SRC = {
  gmail: "/icons/email-clients/gmail.svg",
  apple: "/icons/email-clients/apple-mail.svg",
  outlook: "/icons/email-clients/outlook.svg",
} as const;

type EmailClientLogoProps = {
  className?: string;
};

function EmailClientLogo({ src, className }: EmailClientLogoProps & { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- official brand SVG assets for 1:1 logo fidelity
    <img src={src} alt="" aria-hidden className={className || svgClass} draggable={false} />
  );
}

/** Official Gmail "M" logo (Google, 2020). */
export function GmailLogo({ className }: EmailClientLogoProps) {
  return <EmailClientLogo src={EMAIL_CLIENT_ICON_SRC.gmail} className={className} />;
}

/** Official Apple Mail iOS app icon. */
export function AppleMailLogo({ className }: EmailClientLogoProps) {
  return <EmailClientLogo src={EMAIL_CLIENT_ICON_SRC.apple} className={className} />;
}

/** Official Microsoft Outlook app icon (2018+). */
export function OutlookLogo({ className }: EmailClientLogoProps) {
  return <EmailClientLogo src={EMAIL_CLIENT_ICON_SRC.outlook} className={className} />;
}
