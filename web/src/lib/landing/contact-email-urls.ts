export type ContactEmailClient = "gmail" | "apple" | "outlook";

export function parseMailtoHref(href: string): { email: string; subject?: string } {
  const withoutScheme = href.replace(/^mailto:/i, "");
  const [address, query] = withoutScheme.split("?");
  const params = new URLSearchParams(query || "");
  return {
    email: decodeURIComponent(address),
    subject: params.get("subject") ? decodeURIComponent(params.get("subject")!) : undefined,
  };
}

export function buildContactEmailUrl(
  client: ContactEmailClient,
  email: string,
  subject?: string,
): string {
  const encodedEmail = encodeURIComponent(email);
  const encodedSubject = subject ? encodeURIComponent(subject) : "";

  switch (client) {
    case "gmail":
      return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedEmail}${encodedSubject ? `&su=${encodedSubject}` : ""}`;
    case "apple":
      return `mailto:${email}${encodedSubject ? `?subject=${encodedSubject}` : ""}`;
    case "outlook":
      return `https://outlook.live.com/mail/0/deeplink/compose?to=${encodedEmail}${encodedSubject ? `&subject=${encodedSubject}` : ""}`;
  }
}
