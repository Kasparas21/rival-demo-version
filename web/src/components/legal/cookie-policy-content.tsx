import type { ReactNode } from "react";
import Link from "next/link";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="mb-4 text-xl font-semibold text-[#1a1a1a]">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-[#1a1a1a]">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

function Ul({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5">{children}</ul>;
}

export function CookiePolicyContent() {
  return (
    <>
      <P>
        This Cookie Policy explains how Spy-Rival (&quot;Rival,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
        uses cookies and similar technologies on the Rival website at{" "}
        <a href="https://spy-rival.com" className="text-[#4a7fa5] hover:underline">
          spy-rival.com
        </a>{" "}
        and within our competitor advertising intelligence platform (together, the &quot;Services&quot;).
      </P>
      <P>
        It should be read together with our{" "}
        <Link href="/privacy" className="text-[#4a7fa5] hover:underline">
          Privacy Policy
        </Link>
        , which explains how we handle personal data more generally, and our{" "}
        <Link href="/terms" className="text-[#4a7fa5] hover:underline">
          Terms of Service
        </Link>
        . By using the Services, and where required by giving your consent through our cookie banner, you agree to the
        use of cookies as described in this Policy.
      </P>

      <Section id="what-are-cookies" title="1. What are cookies?">
        <P>
          Cookies are small text files that a website places on your device (computer, tablet, or phone) when you visit.
          They are widely used to make websites work, to make them work more efficiently, to remember your preferences,
          and to provide information to the site&apos;s operators.
        </P>
        <P>
          This Policy also covers similar technologies that perform comparable functions, such as local storage, pixels,
          tags, and software development kits (SDKs). For simplicity, we refer to all of these as &quot;cookies.&quot;
        </P>
        <P>Cookies may be:</P>
        <Ul>
          <li>
            <strong>First-party cookies</strong> — set by us, directly through the Services.
          </li>
          <li>
            <strong>Third-party cookies</strong> — set by service providers we use (for example, an analytics or payment
            provider) when you use the Services.
          </li>
        </Ul>
        <P>Cookies may also be:</P>
        <Ul>
          <li>
            <strong>Session cookies</strong> — temporary cookies deleted when you close your browser.
          </li>
          <li>
            <strong>Persistent cookies</strong> — cookies that remain on your device for a set period or until you
            delete them.
          </li>
        </Ul>
      </Section>

      <Section id="why-we-use" title="2. Why we use cookies">
        <P>We use cookies to:</P>
        <Ul>
          <li>keep you signed in and maintain your session as you move through the Services;</li>
          <li>keep the Services secure and detect or prevent fraud and abuse;</li>
          <li>remember your settings and preferences;</li>
          <li>understand how the Services are used so we can measure performance and improve them; and</li>
          <li>where applicable and with your consent, support our marketing.</li>
        </Ul>
        <P>
          We do <strong>not</strong> use cookies to sell your personal data, and we do not use cookies to serve
          third-party behavioral advertising within the Services.
        </P>
      </Section>

      <Section id="categories" title="3. Categories of cookies we use">
        <P>We group the cookies we use into the following categories.</P>
        <SubSection title="3.1 Strictly necessary cookies">
          <P>
            These cookies are essential for the Services to function and cannot be switched off in our systems. They are
            usually set in response to actions you take, such as logging in, setting privacy preferences, or filling in
            forms. They include cookies that:
          </P>
          <Ul>
            <li>authenticate you and keep you logged in;</li>
            <li>maintain the security and integrity of your session;</li>
            <li>remember your cookie-consent choices;</li>
            <li>support core platform functionality.</li>
          </Ul>
          <P>
            Because these cookies are strictly necessary to provide a service you have requested, they do not require
            your consent. If you block them through your browser, parts of the Services may not work.
          </P>
        </SubSection>
        <SubSection title="3.2 Functional / preference cookies">
          <P>
            These cookies allow the Services to remember choices you make and provide enhanced, more personal features
            (for example, remembering your interface preferences). If you do not allow these cookies, some features may
            not function as intended.
          </P>
        </SubSection>
        <SubSection title="3.3 Analytics / performance cookies">
          <P>
            These cookies help us understand how visitors use the Website and Services — which pages and features are
            used, how often, and whether errors occur — so that we can measure and improve performance. The information
            these cookies collect is used in aggregate. Where required by law, we set these cookies only with your
            consent.
          </P>
        </SubSection>
        <SubSection title="3.4 Marketing cookies">
          <P>
            Where we use marketing cookies (for example, to measure the effectiveness of our own campaigns or to
            understand how you arrived at our Website), we set them only with your consent where required by law. You
            can withdraw this consent at any time.
          </P>
        </SubSection>
      </Section>

      <Section id="third-party" title="4. Third-party cookies and service providers">
        <P>
          Some cookies are set by trusted third parties that help us operate the Services, such as our hosting and
          infrastructure providers, our payment processor, authentication providers, and analytics tools. These providers
          may set cookies when you use the Services, and their use of information is governed by their own privacy and
          cookie policies.
        </P>
        <P>
          The specific third parties we use may change over time as we improve the Services. The categories above
          describe the purposes for which such cookies are used.
        </P>
      </Section>

      <Section id="your-choices" title="5. Your choices and how to manage cookies">
        <SubSection title="5.1 Cookie banner and settings">
          <P>
            Where required by law, when you first visit the Website we present a cookie banner that lets you accept or
            reject non-essential cookies and manage your preferences. You can change your preferences at any time through
            the cookie settings on the Website (where available) or by contacting us.
          </P>
          <P>
            Strictly necessary cookies are always active because the Services cannot function without them.
          </P>
        </SubSection>
        <SubSection title="5.2 Browser controls">
          <P>
            Most browsers let you view, manage, block, and delete cookies through their settings. The method differs by
            browser — check your browser&apos;s help pages. Please note that if you block or delete strictly necessary
            cookies, parts of the Services may stop working, and you may need to set some preferences again on each
            visit.
          </P>
        </SubSection>
        <SubSection title="5.3 Do Not Track">
          <P>
            Some browsers offer a &quot;Do Not Track&quot; (DNT) setting. Because there is no common industry standard for
            how DNT signals should be interpreted, we do not currently respond to them. We do, however, honor the cookie
            choices you make through our banner and settings as described above.
          </P>
        </SubSection>
      </Section>

      <Section id="changes" title="6. Changes to this Cookie Policy">
        <P>
          We may update this Cookie Policy from time to time to reflect changes in the technologies we use or for legal
          or operational reasons. When we make changes, we will update the &quot;Last updated&quot; date above and, where
          required, ask for your consent again. Your continued use of the Services after a change takes effect
          constitutes acceptance of the updated Policy, to the extent permitted by law.
        </P>
      </Section>

      <Section id="contact" title="7. Contact us">
        <P>If you have any questions about this Cookie Policy or our use of cookies, please contact us at:</P>
        <Ul>
          <li>
            <strong>Spy-Rival</strong>
          </li>
          <li>
            Website:{" "}
            <a href="https://spy-rival.com" className="text-[#4a7fa5] hover:underline">
              spy-rival.com
            </a>
          </li>
          <li>
            Email:{" "}
            <a href="mailto:hello@spy-rival.com" className="text-[#4a7fa5] hover:underline">
              hello@spy-rival.com
            </a>
          </li>
        </Ul>
      </Section>

      <div className="mt-10 rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-4 text-sm text-amber-950">
        <P>
          This Cookie Policy is provided as a general template tailored to the Rival service. It does not constitute
          legal advice. Before publishing, confirm it against the actual cookies and similar technologies your site and
          platform set — ideally using a cookie-scanning tool — and have it reviewed by a qualified data-protection
          lawyer. Under EU ePrivacy rules, non-essential cookies generally require prior consent via a compliant cookie
          banner; make sure your banner is configured to block non-essential cookies until consent is given.
        </P>
      </div>
    </>
  );
}
