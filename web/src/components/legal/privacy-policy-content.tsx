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

export function PrivacyPolicyContent() {
  return (
    <>
      <P>
        This Privacy Policy describes how Spy-Rival (&quot;Rival,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
        collects, stores, uses, discloses, and otherwise processes personal data in connection with the Rival website at{" "}
        <a href="https://spy-rival.com" className="text-[#4a7fa5] hover:underline">
          spy-rival.com
        </a>{" "}
        (the &quot;Website&quot;), the Rival competitor advertising intelligence platform we make available through it, and
        all related services, technology, data, and materials (collectively, the &quot;Services&quot;).
      </P>
      <P>
        Your privacy matters to us, and we are committed to handling your personal data fairly, lawfully, and transparently.
        Please read this Privacy Policy carefully. By accessing or using the Website or the Services, you acknowledge that
        you have read and understood this Privacy Policy. If you do not agree with it, please do not access or use the
        Website or the Services.
      </P>
      <P>
        Capitalized terms not defined here have the meaning given in our{" "}
        <Link href="/terms" className="text-[#4a7fa5] hover:underline">
          Terms of Service
        </Link>
        , which also governs your use of the Services.
      </P>

      <Section id="who-we-are" title="1. Who We Are and Our Role">
        <P>
          Spy-Rival is the operator of the Services and acts as the data controller for the personal data described in
          this Policy that we collect to operate, provide, secure, and improve the Services — for example, your account
          details, billing information, and usage data. This means we determine how and why that personal data is
          processed, and we are responsible for it under the EU General Data Protection Regulation (GDPR) and applicable
          national data-protection law.
        </P>
        <P>For questions about this Policy or to exercise your rights, contact us at the details in Section 15.</P>
      </Section>

      <Section id="public-ad-data" title="2. Important Note on the Data Rival Analyzes">
        <P>
          Rival is a competitor advertising intelligence tool. Its core function is to retrieve and analyze publicly
          available advertising data that advertising platforms (such as Meta, Google, TikTok, LinkedIn, Pinterest, and
          Snapchat) publish themselves through their official ad transparency libraries (&quot;Public Ad Data&quot;).
        </P>
        <P>
          Public Ad Data is information about advertisements and the brands running them — it is business and marketing
          information, not personal data that we solicit from you about yourself. Where Public Ad Data incidentally
          contains personal data (for example, the name of an individual who appears in or is named within an ad that an
          advertiser has chosen to make public), we process it only to provide the analytical Services, on the basis of
          our legitimate interest in operating a competitive-intelligence tool over already-public advertising material,
          and in a manner consistent with applicable law. This Privacy Policy primarily concerns the personal data of
          you, our users — not the contents of the public ads you analyze.
        </P>
      </Section>

      <Section id="data-we-collect" title="3. Personal Data We Collect">
        <SubSection title="3.1 Information you provide to us">
          <P>
            When you create an account, start a trial, subscribe, or contact us, we collect information you give us, which
            may include:
          </P>
          <Ul>
            <li>
              <strong>Account and contact information</strong> — your name, email address, password (stored in hashed
              form), and any company name, role, or profile details you choose to provide.
            </li>
            <li>
              <strong>Billing information</strong> — your billing name, address, country, VAT number (if applicable), and
              the details needed to process payment. Full payment card numbers are handled by our payment processor and
              are not stored on our own systems.
            </li>
            <li>
              <strong>The brands and domains you choose to track</strong> — the competitor domains you add to the
              Services. (These identify businesses, not you, but we associate them with your account.)
            </li>
            <li>
              <strong>Communications</strong> — the content of messages you send us, such as support requests or
              feedback.
            </li>
          </Ul>
        </SubSection>
        <SubSection title="3.2 Information we collect automatically">
          <P>
            When you use the Website or Services, we and our service providers automatically collect certain technical
            and usage data, which may include:
          </P>
          <Ul>
            <li>
              <strong>Device and connection data</strong> — IP address, browser type, device type, operating system, and
              similar technical identifiers.
            </li>
            <li>
              <strong>Usage data</strong> — pages and features you view, actions you take in the Services, dates and
              times of access, and similar analytics.
            </li>
            <li>
              <strong>Cookies and similar technologies</strong> — as described in Section 8.
            </li>
          </Ul>
        </SubSection>
        <SubSection title="3.3 Information from third parties">
          <P>
            We may receive limited information from third parties that help us operate, such as our payment processor
            (confirming a payment succeeded or failed) and analytics or authentication providers. We do not buy personal
            data about you from data brokers for marketing.
          </P>
        </SubSection>
        <P>
          We do not knowingly collect special categories of sensitive personal data (such as health, biometric, or
          government-identifier data) about our users, and you should not submit such data to the Services.
        </P>
      </Section>

      <Section id="how-we-use" title="4. How and Why We Use Personal Data (Purposes and Legal Bases)">
        <P>
          We use personal data only where we have a lawful basis to do so under the GDPR. The purposes and corresponding
          legal bases are:
        </P>
        <Ul>
          <li>
            <strong>To provide the Services</strong> — creating and managing your account, delivering the platform&apos;s
            features, and retrieving and analyzing the competitors you track. Legal basis: performance of our contract
            with you.
          </li>
          <li>
            <strong>To process payments, billing, and renewals</strong> — charging your payment method, issuing invoices,
            handling refunds, and preventing payment fraud. Legal basis: performance of our contract; compliance with
            legal obligations (e.g., tax/accounting); and our legitimate interests in preventing fraud.
          </li>
          <li>
            <strong>To operate, secure, troubleshoot, and improve the Services</strong> — monitoring performance,
            diagnosing problems, ensuring security and quality, and developing new features. Legal basis: our legitimate
            interests in running and improving a reliable, secure service.
          </li>
          <li>
            <strong>To communicate with you</strong> — sending service-related messages (such as your weekly digest,
            account notices, security alerts, and policy updates) and responding to your enquiries. Legal basis:
            performance of our contract and our legitimate interests in supporting you.
          </li>
          <li>
            <strong>To send marketing communications</strong> — where permitted, telling you about features, offers, or
            related products. Legal basis: your consent where required, or our legitimate interests in marketing to
            existing customers. You can opt out at any time (see Section 9).
          </li>
          <li>
            <strong>To comply with law and protect rights</strong> — meeting legal and regulatory obligations, enforcing
            our Terms, and establishing, exercising, or defending legal claims. Legal basis: compliance with legal
            obligations and our legitimate interests in protecting our business and users.
          </li>
        </Ul>
        <P>
          Where we rely on legitimate interests, we have assessed that those interests are not overridden by your rights
          and freedoms. You may ask us about this assessment using the contact details in Section 15.
        </P>
      </Section>

      <Section id="ai-processing" title="5. AI and Automated Processing">
        <P>
          The Services use automated systems and artificial intelligence to analyze Public Ad Data and produce insights
          (such as angle classification, funnel-stage tagging, activity scores, and recommendations). This automated
          processing operates on advertising data and account/usage data; it does not make decisions that produce legal or
          similarly significant effects about you as an individual. We may use aggregated and de-identified data derived
          from use of the Services to improve our models and the Services, as described in Section 6.
        </P>
      </Section>

      <Section id="aggregated-data" title="6. Aggregated and De-Identified Data">
        <P>
          We may create aggregated, anonymized, or de-identified data from personal data and usage data — data that does
          not identify you or any individual. This may include statistics about how the Services are used, performance
          metrics, and analytical benchmarks. Such data is not personal data, and we may use and share it for any lawful
          purpose, including improving and promoting the Services. We will not attempt to re-identify de-identified data.
        </P>
      </Section>

      <Section id="sharing" title="7. How We Share Personal Data">
        <P>We do not sell your personal data. We share personal data only as described below:</P>
        <Ul>
          <li>
            <strong>Service providers (processors)</strong> — trusted third parties that perform services on our behalf,
            such as cloud hosting and infrastructure, payment processing, the scraping/data-retrieval infrastructure that
            powers the Services, AI/LLM providers used for analysis, email delivery, error monitoring, and analytics.
            These providers are bound by contracts requiring them to protect personal data and use it only as we instruct.
          </li>
          <li>
            <strong>Legal and safety</strong> — regulators, law-enforcement, courts, or other authorities where required
            by law or where reasonably necessary to comply with a legal obligation, enforce our Terms, or protect the
            rights, property, or safety of Rival, our users, or others.
          </li>
          <li>
            <strong>Business transfers</strong> — in connection with a merger, acquisition, financing, reorganization, or
            sale of assets, in which case personal data may be transferred subject to this Policy.
          </li>
          <li>
            <strong>With your direction or consent</strong> — where you ask us to share information or otherwise agree to
            it.
          </li>
        </Ul>
        <P>
          We may engage sub-processors to deliver the Services. You may request information about the categories of
          sub-processors we use by contacting us at the details in Section 15.
        </P>
      </Section>

      <Section id="cookies" title="8. Cookies and Similar Technologies">
        <P>
          We use cookies and similar technologies on the Website to keep you logged in, remember your preferences, keep the
          Service secure, and understand how the Service is used so we can improve it. Some cookies are strictly necessary
          for the Service to function; others are used for analytics or preferences.
        </P>
        <P>
          Where required by law, we will ask for your consent before setting non-essential cookies. You can manage or block
          cookies through your browser settings, but some features of the Service may not work properly if you do. For more
          detail, see our{" "}
          <Link href="/cookies" className="text-[#4a7fa5] hover:underline">
            Cookie Policy
          </Link>
          , or contact us.
        </P>
        <P>
          We do not currently respond to browser &quot;Do Not Track&quot; signals, as there is no common industry standard
          for them.
        </P>
      </Section>

      <Section id="marketing" title="9. Marketing Choices">
        <P>
          If we send you marketing emails, you can opt out at any time by using the unsubscribe link in the email or by
          contacting us. Opting out of marketing does not stop service-related messages that are necessary to operate your
          account (such as billing notices, security alerts, or important changes to the Services).
        </P>
      </Section>

      <Section id="transfers" title="10. International Data Transfers">
        <P>
          We are based in the European Union, and we aim to store and process personal data within the European Economic
          Area (EEA) where practicable. However, some of our service providers may process personal data outside the EEA,
          including in the United States.
        </P>
        <P>
          Where we transfer personal data outside the EEA to a country that has not been recognized by the European
          Commission as providing an adequate level of protection, we put appropriate safeguards in place, such as the
          European Commission&apos;s Standard Contractual Clauses, together with any additional measures required to
          protect the data. You may request more information about these safeguards using the contact details in Section
          15.
        </P>
      </Section>

      <Section id="retention" title="11. Data Retention">
        <P>
          We retain personal data for as long as your account is active and for as long as reasonably necessary to:
          provide the Services; comply with our legal, tax, and accounting obligations; resolve disputes and enforce our
          agreements; and establish, exercise, or defend legal claims.
        </P>
        <P>
          When personal data is no longer needed for these purposes, we will securely delete it or anonymize it. If you
          delete your account, we will delete or anonymize your personal data within a reasonable period, except for any
          data we are required or permitted to retain by law or for the legitimate purposes described above (for example,
          billing records kept for tax compliance, or limited backup copies retained for a short period before secure
          deletion).
        </P>
      </Section>

      <Section id="your-rights" title="12. Your Data Protection Rights">
        <P>
          If you are in the EEA, the United Kingdom, or another jurisdiction granting equivalent rights, you have the
          following rights in relation to your personal data, subject to conditions and exceptions under applicable law:
        </P>
        <Ul>
          <li>
            <strong>Access</strong> — to be told whether we process your personal data and to receive a copy of it.
          </li>
          <li>
            <strong>Rectification</strong> — to have inaccurate or incomplete personal data corrected.
          </li>
          <li>
            <strong>Erasure</strong> — to have your personal data deleted in certain circumstances (the &quot;right to be
            forgotten&quot;).
          </li>
          <li>
            <strong>Restriction</strong> — to ask us to limit how we use your personal data in certain circumstances.
          </li>
          <li>
            <strong>Objection</strong> — to object to processing based on our legitimate interests, and to object to
            direct marketing at any time.
          </li>
          <li>
            <strong>Portability</strong> — to receive certain personal data you provided to us in a structured, commonly
            used, machine-readable format, and to have it transmitted to another controller where technically feasible.
          </li>
          <li>
            <strong>Withdraw consent</strong> — where we rely on your consent, to withdraw it at any time, without
            affecting processing already carried out.
          </li>
          <li>
            <strong>Lodge a complaint</strong> — to complain to a data protection supervisory authority. If you are in
            Lithuania, this is the State Data Protection Inspectorate (Valstybinė duomenų apsaugos inspekcija); you may
            also contact the authority in your country of residence.
          </li>
        </Ul>
        <P>
          To exercise any of these rights, contact us using the details in Section 15. We may need to verify your identity
          before acting on a request. We will respond within the time required by applicable law (generally one month,
          extendable where permitted). We do not charge a fee for handling a request unless it is manifestly unfounded or
          excessive.
        </P>
      </Section>

      <Section id="children" title="13. Children's Privacy">
        <P>
          The Services are intended for businesses and professionals and are not directed to individuals under the age of
          18. We do not knowingly collect personal data from children. If you believe a child has provided us with
          personal data, please contact us, and we will take appropriate steps to delete it.
        </P>
      </Section>

      <Section id="security" title="14. Security, Breaches, and Third-Party Links">
        <P>
          <strong>Security.</strong> We maintain reasonable administrative, technical, and organizational measures designed
          to protect personal data against unauthorized access, loss, misuse, or alteration. However, no method of
          transmission over the internet or method of storage is completely secure, and we cannot guarantee absolute
          security.
        </P>
        <P>
          <strong>Breach notification.</strong> If we become aware of a personal data breach that poses a risk to your
          rights and freedoms, we will notify the relevant supervisory authority and, where required by law, affected
          individuals, within the timeframes required by applicable law.
        </P>
        <P>
          <strong>Third-party links.</strong> The Website and Services, including landing-page previews and links derived
          from Public Ad Data, may link to third-party websites we do not control. We are not responsible for the privacy
          practices of those third parties, and we encourage you to review their privacy policies.
        </P>
      </Section>

      <Section id="contact" title="15. Contact Us and How to Exercise Your Rights">
        <P>To contact us about this Privacy Policy, or to exercise any of your rights, reach us at:</P>
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
        <P>
          Please include enough detail for us to understand and respond to your request. We may ask you to verify your
          identity before we act on it.
        </P>
      </Section>

      <Section id="changes" title="16. Changes to This Privacy Policy">
        <P>
          We may update this Privacy Policy from time to time. If we make material changes, we will take reasonable steps
          to notify you, such as by email or by posting a notice within the Service or on spy-rival.com, and we will
          update the &quot;Last updated&quot; date above. We will not use your personal data in a materially different way
          than stated at the time of collection without an appropriate legal basis or, where required, your consent. Your
          continued use of the Services after changes take effect constitutes acceptance of the updated Policy, to the
          extent permitted by law.
        </P>
      </Section>

      <div className="mt-10 rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-4 text-sm text-amber-950">
        <P>
          This Privacy Policy is provided as a general template tailored to the Rival service. It does not constitute legal
          advice. Before publishing, have it reviewed by a qualified data-protection lawyer to confirm it accurately
          reflects your actual data flows, sub-processors, retention periods, and obligations under the GDPR and
          applicable national law.
        </P>
      </div>
    </>
  );
}
