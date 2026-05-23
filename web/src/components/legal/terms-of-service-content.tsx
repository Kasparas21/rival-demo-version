import type { ReactNode } from "react";

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

export function TermsOfServiceContent() {
  return (
    <>
      <P>
        Welcome to Rival. These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Rival
        website, application, and related services (collectively, the &quot;Service&quot;) available at spy-rival.com.
        The Service is operated by Spy-Rival (&quot;Rival,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
      </P>
      <P>
        Please read these Terms carefully. By creating an account, starting a free trial, subscribing to a paid plan, or
        otherwise accessing or using the Service, you agree to be bound by these Terms. If you do not agree to these
        Terms, you may not access or use the Service.
      </P>
      <P>
        If you are entering into these Terms on behalf of a company or other legal entity, you represent that you have
        the authority to bind that entity, and &quot;you&quot; and &quot;your&quot; refer to that entity.
      </P>

      <Section id="definitions" title="1. Definitions">
        <P>Throughout these Terms, the following words have the meanings set out below.</P>
        <Ul>
          <li>
            <strong>&quot;Account&quot;</strong> means the registered account you create to access and use the Service.
          </li>
          <li>
            <strong>&quot;Competitor&quot; or &quot;tracked brand&quot;</strong> means any brand, business, or domain you
            add to the Service so that Rival can retrieve and analyze its publicly available advertising data.
          </li>
          <li>
            <strong>&quot;Public Ad Data&quot;</strong> means advertising creatives, copy, metadata, and related
            information that advertising platforms make publicly available through their own official ad transparency
            libraries, including but not limited to those operated by Meta, Google, TikTok, LinkedIn, Pinterest, and
            Snapchat.
          </li>
          <li>
            <strong>&quot;Subscription&quot;</strong> means a paid plan that grants you access to the Service for a
            recurring period.
          </li>
          <li>
            <strong>&quot;Trial&quot;</strong> means the free evaluation period offered before a paid Subscription
            begins, as described in Section 4.
          </li>
          <li>
            <strong>&quot;Your Content&quot;</strong> means any data, text, brand domains, or other materials you submit
            to or input into the Service.
          </li>
        </Ul>
      </Section>

      <Section id="eligibility" title="2. Eligibility and Accounts">
        <P>
          You must be at least 18 years old and capable of forming a binding contract to use the Service. By using the
          Service you represent and warrant that you meet these requirements.
        </P>
        <P>
          To use most features of the Service, you must register for an Account. When you register, you agree to provide
          accurate, current, and complete information and to keep that information up to date. You are responsible for
          safeguarding your login credentials and for all activity that occurs under your Account. You agree to notify us
          immediately at the contact details in Section 18 if you suspect any unauthorized use of your Account.
        </P>
        <P>
          We reserve the right to suspend or terminate an Account that contains information we reasonably believe to be
          false, outdated, or incomplete, or where we reasonably believe these Terms have been violated.
        </P>
      </Section>

      <Section id="the-service" title="3. The Service">
        <P>
          Rival is a competitor advertising intelligence platform. It retrieves Public Ad Data for the Competitors you
          choose to track across supported advertising platforms, organizes that data into a single dashboard, and applies
          automated and AI-assisted analysis to produce insights such as creative angle classification, funnel-stage
          tagging, activity scoring, strategy mapping, and tactical recommendations.
        </P>
        <P>
          We may add, modify, or remove features of the Service at any time. We may also change which advertising
          platforms are supported. We will use reasonable efforts to notify you of material changes that adversely affect
          features you actively use, but we are not obligated to maintain any particular feature, platform coverage, or
          data source indefinitely.
        </P>
        <P>
          The Service relies on third-party data sources that are outside our control. The availability, completeness,
          accuracy, and timeliness of Public Ad Data depend on those third parties, and we do not guarantee that any
          particular ad, brand, platform, or data point will be available through the Service.
        </P>
      </Section>

      <Section id="free-trial" title="4. Free Trial">
        <P>We may offer a free Trial of the Service. Unless stated otherwise at the time of signup, the Trial lasts seven (7) days, requires a valid payment method at signup, and provides access to the Service for one (1) tracked Competitor along with the analytical features described at the point of signup.</P>
        <P>Important terms that apply to the Trial:</P>
        <Ul>
          <li>
            <strong>Automatic conversion to a paid Subscription.</strong> You may cancel at any time during the Trial
            period and you will not be charged. If you do not cancel before the Trial ends, your payment method will
            automatically be charged for the Subscription plan you selected, at the price displayed at signup, and your
            Subscription will begin and renew on the terms in Section 5. It is your responsibility to cancel before the
            Trial ends if you do not wish to be charged.
          </li>
          <li>
            <strong>No refund for forgetting to cancel.</strong> If you forget or fail to cancel before the Trial
            converts, the resulting charge is valid and non-refundable in accordance with Section 6, except (a) where you
            are a consumer exercising the 14-day right of withdrawal described in Section 6.5, or (b) where a money-back
            guarantee applies (see Section 6.4). We are not obligated to issue a refund, credit, or reversal because you
            did not cancel in time, did not use the Service after conversion, or were unaware the Trial had ended, once
            any applicable withdrawal period has passed. We send a reminder where practicable, but the obligation to
            cancel rests with you.
          </li>
          <li>
            <strong>One Trial per customer.</strong> Each customer is entitled to one Trial. We reserve the right to
            refuse, limit, shorten, suspend, or revoke a Trial at any time, with or without notice, including where we
            reasonably suspect abuse, such as the creation of multiple Accounts, the use of multiple email addresses or
            payment methods, or any other attempt to obtain repeated or extended Trials. No compensation or refund is
            provided in respect of any Trial.
          </li>
          <li>
            <strong>Trial data.</strong> Unless you purchase a Subscription, data associated with your Trial may be
            permanently deleted at or after the end of the Trial, and we will not be obligated to recover it.
          </li>
        </Ul>
        <P>
          The specific scope, duration, and conditions of a Trial are those presented to you at the time you sign up,
          which prevail over the general description above if they differ.
        </P>
      </Section>

      <Section id="plans-billing" title="5. Plans, Fees, and Billing">
        <SubSection title="5.1 Subscription plans">
          <P>
            The Service is offered through paid Subscription plans. The features, limits, and prices of each plan are
            described on our pricing page and at the point of purchase. Plan limits may include the number of tracked
            Competitors, the number of user seats, and the availability of certain features.
          </P>
        </SubSection>
        <SubSection title="5.2 Billing and renewal">
          <P>
            Subscriptions are billed in advance on a recurring basis (monthly or annually, depending on the plan you
            choose). By subscribing, you authorize us and our payment processor to charge your payment method for all
            fees payable for your selected plan on each renewal date, at the then-applicable price and billing frequency,
            until you cancel and all outstanding fees are paid in full. Your Subscription automatically renews for
            successive periods of the same length unless you cancel before the end of the current period.
          </P>
          <P>
            You agree to keep your payment method and billing information accurate, complete, and up to date, and you
            authorize us to take steps to verify that the payment details you provide are valid. You are solely
            responsible for any overdraft, interest, or other charges your bank or card issuer may impose as a result of
            our authorized charges. We may terminate or suspend the Service immediately if the payment information on
            file is inaccurate, incomplete, or out of date.
          </P>
        </SubSection>
        <SubSection title="5.3 Failed and late payments">
          <P>
            If a charge fails or any undisputed fee becomes overdue, we may, without limiting our other remedies: (a)
            suspend or terminate your access to the Service; (b) apply a late charge on the unpaid amount equal to the
            lesser of 1% per month or the maximum rate permitted by law; and (c) retry the charge and pursue any other
            remedy available to us. You remain responsible for all fees accrued up to the effective date of any
            cancellation or termination.
          </P>
        </SubSection>
        <SubSection title="5.4 Chargebacks">
          <P>
            If you initiate a chargeback or dispute a charge with your card issuer or bank for a charge that is valid
            under these Terms, we reserve the right to dispute and seek reversal of that chargeback, to suspend or
            terminate your Account, and to recover any associated costs. Initiating chargebacks instead of using the
            cancellation and dispute processes described in these Terms is a breach of these Terms.
          </P>
        </SubSection>
        <SubSection title="5.5 Billing disputes">
          <P>
            If you believe in good faith that you have been billed incorrectly, you must notify us in writing within
            fifteen (15) days of the relevant charge or invoice date, identifying the disputed amount and the reason. We
            will work with you promptly and in good faith to resolve the dispute. Charges not disputed within this period
            are deemed accepted, except where a longer period is required by applicable law.
          </P>
        </SubSection>
        <SubSection title="5.6 Price changes">
          <P>
            We may change Subscription prices. If we change the price of a plan you are subscribed to, we will give you
            reasonable advance notice, and the new price will apply from your next renewal. If you do not agree to a
            price change, you may cancel before it takes effect.
          </P>
        </SubSection>
        <SubSection title="5.7 Taxes">
          <P>
            All fees are exclusive of taxes unless stated otherwise. You are responsible for any applicable value-added
            tax (VAT), sales tax, goods and services tax (GST), or other taxes, levies, or duties, except for taxes based
            on our net income. If you are a business located in the European Union, you represent that you are registered
            for VAT purposes in your member state and agree to provide your VAT registration number on request; if you do
            not provide a valid VAT number before a transaction is processed, we will not be obligated to issue refunds
            or credits for any VAT charged.
          </P>
        </SubSection>
        <SubSection title="5.8 Payment processing">
          <P>
            Payments are handled by third-party payment processors. By providing payment information, you agree to the
            applicable processor&apos;s terms in addition to these Terms, and you consent to the disclosure of your
            payment information to that processor for the purpose of processing payments. We do not store full payment
            card details on our own systems.
          </P>
        </SubSection>
      </Section>

      <Section id="cancellation-refunds" title="6. Cancellation and Refunds">
        <SubSection title="6.1 Cancellation">
          <P>
            You may cancel your Subscription at any time through your Account settings. Cancellation takes effect at the
            end of your current billing period. After cancellation, you retain access to the Service until the end of the
            period you have already paid for, and you will not be charged again.
          </P>
        </SubSection>
        <SubSection title="6.2 Fees are non-refundable">
          <P>
            Except where required by mandatory applicable law (including the consumer rights described in Section 6.5),
            or where expressly stated in these Terms or in a money-back guarantee we offer at the point of sale, all
            payment obligations are non-cancelable, all fees are paid in advance, and all amounts paid are
            non-refundable. We do not provide refunds or credits for partial billing periods, for unused features, for
            tracked-Competitor slots or seats you did not use, for periods during which you did not use the Service, or
            because you forgot to cancel before a renewal or before a Trial converted (see Section 4).
          </P>
        </SubSection>
        <SubSection title="6.3 Discretionary refunds and processing deduction">
          <P>
            Where we choose, at our discretion, to grant a refund that is not required by law or by a money-back guarantee,
            any such refund may be reduced by a processing deduction of five percent (5%) to cover non-recoverable
            transaction costs. This deduction does not apply where a refund is required by mandatory applicable law or
            where a money-back guarantee states otherwise.
          </P>
        </SubSection>
        <SubSection title="6.4 Money-back guarantee">
          <P>
            If we advertise a specific money-back guarantee at the point of sale, the terms of that guarantee (including
            its duration and conditions) apply in addition to these Terms, and we will honor it as described. The
            money-back guarantee, where offered, prevails over Section 6.2 to the extent of any conflict.
          </P>
        </SubSection>
        <SubSection title="6.5 Consumer right of withdrawal (EU/EEA and equivalent jurisdictions)">
          <P>
            If you are a consumer (an individual acting wholly or mainly outside your trade, business, craft, or
            profession) in the European Union, the European Economic Area, or another jurisdiction that grants a
            statutory right of withdrawal, this Section 6.5 applies in addition to the rest of Section 6, and prevails
            over Sections 4, 6.2, and 6.3 to the extent of any conflict.
          </P>
          <P>
            <strong>Your 14-day right.</strong> You have the right to withdraw from your purchase of the Service within
            fourteen (14) days, without giving any reason. The period runs from the day the contract is concluded — which,
            for a Subscription that begins after a Trial, is the day the Trial converts and the charge is made.
          </P>
          <P>
            <strong>How to withdraw.</strong> To exercise this right, send us a clear statement of your decision to
            withdraw before the 14-day period ends, by email to the address in Section 21. You may, but do not have to,
            use a model withdrawal form.
          </P>
          <P>
            <strong>Refund on withdrawal.</strong> If you validly withdraw within the period, we will reimburse the
            payment you made for that purchase within fourteen (14) days of being informed, using the same payment method
            you used, with no 5% deduction and no charge for the withdrawal itself. The reimbursement covers the
            Subscription charge for the current period being withdrawn from; it does not revive or refund earlier periods
            already paid in prior cycles.
          </P>
          <P>
            <strong>After the 14 days.</strong> Once the 14-day withdrawal period has expired, the right of withdrawal
            no longer applies, and the non-refundable and non-cancelable terms in Sections 4 and 6.2 apply in full —
            including where you forgot to cancel before a renewal or before a Trial converted, provided more than 14 days
            have passed since the relevant charge.
          </P>
          <P>
            <strong>Business customers.</strong> This Section 6.5 applies only to consumers. If you use the Service for
            purposes relating to your trade, business, craft, or profession, you are not a consumer for these purposes
            and have no right of withdrawal under this Section; Sections 4 and 6.2 apply to you in full.
          </P>
          <P>
            <strong>Mandatory rights preserved.</strong> Nothing in these Terms removes or limits any mandatory consumer
            right that cannot be waived under the applicable law of your country of residence.
          </P>
        </SubSection>
      </Section>

      <Section id="acceptable-use" title="7. Acceptable Use">
        <P>You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree that you will not, and will not permit any third party to:</P>
        <Ul>
          <li>Use the Service to violate any applicable law or regulation, or to infringe the rights of any third party.</li>
          <li>
            Attempt to access, scrape, harvest, or extract data from the Service itself other than through features we
            provide, including by automated means, scraping, or reverse engineering of our systems.
          </li>
          <li>
            Circumvent, disable, or interfere with security or access-control features of the Service, or attempt to gain
            unauthorized access to any part of the Service, other accounts, or our systems.
          </li>
          <li>
            Resell, sublicense, rent, lease, or otherwise make the Service available to third parties except as expressly
            permitted by your plan (for example, sharing access among the seats included in your plan).
          </li>
          <li>
            Use the Service to build, train, or improve a competing product or service, or to create a substantially
            similar product.
          </li>
          <li>
            Upload or transmit malicious code, or use the Service in a way that imposes an unreasonable or
            disproportionately large load on our infrastructure or that of our data sources.
          </li>
          <li>
            Use the Service to engage in unlawful surveillance, harassment, or any activity that would violate the privacy
            or data-protection rights of individuals.
          </li>
          <li>
            Exceed, or attempt to circumvent, the usage limits of your plan (such as the number of tracked Competitors,
            seats, refreshes, or exports).
          </li>
        </Ul>
        <P>
          We may investigate and take appropriate action against anyone who, in our sole discretion, violates this
          section, including suspending or terminating their Account and reporting conduct to law enforcement where
          appropriate.
        </P>
      </Section>

      <Section id="data-sources" title="8. Data Sources, Public Information, and Third Parties">
        <P>
          The Service retrieves and analyzes Public Ad Data that advertising platforms themselves publish through their
          official ad transparency tools and libraries. This data is publicly accessible information made available by
          those platforms.
        </P>
        <P>
          We are not affiliated with, endorsed by, or sponsored by Meta, Google, TikTok, LinkedIn, Pinterest, Snapchat,
          or any other platform or brand referenced in the Service. All product names, logos, and brands referenced
          through the Service are the property of their respective owners and are used for identification and descriptive
          purposes only.
        </P>
        <P>
          Your use of the Service does not grant you any rights in the Public Ad Data or in the intellectual property of
          the brands whose ads are displayed. The advertising creatives and copy shown through the Service remain the
          property of their respective owners. You are responsible for ensuring that your own use of any data, insights,
          or creative ideas obtained through the Service complies with applicable intellectual-property, advertising, and
          competition laws. Insights about competitor angles and creatives are provided for analysis and inspiration;
          copying a third party&apos;s creative work verbatim may infringe that party&apos;s rights, and you are solely
          responsible for your own creative output.
        </P>
        <P>
          The Service may link to or interoperate with third-party websites and services. We are not responsible for the
          content, policies, or practices of any third party.
        </P>
      </Section>

      <Section id="ai-analysis" title="9. AI-Generated Analysis and No Professional Advice">
        <P>
          The Service uses automated systems and artificial intelligence to classify, summarize, infer, and generate
          insights, including audience inferences, funnel-stage tags, strategy summaries, activity scores, and tactical
          recommendations (&quot;Analytical Output&quot;).
        </P>
        <P>
          Analytical Output is generated by automated means and may be incomplete, inaccurate, or outdated. It represents
          probabilistic interpretation, not verified fact. We do not warrant the accuracy, reliability, or fitness for
          any purpose of any Analytical Output. You should independently verify any information before relying on it.
        </P>
        <P>
          Analytical Output is provided for informational purposes only and does not constitute legal, financial,
          marketing, business, or other professional advice. Any decisions you make based on the Service, including
          advertising, budgeting, or strategic decisions, are made at your own risk and discretion.
        </P>
      </Section>

      <Section id="your-content" title="10. Your Content and Account Data">
        <P>
          You retain all rights in Your Content. You grant us a worldwide, non-exclusive, royalty-free license to host,
          store, process, and use Your Content solely to operate, provide, secure, and improve the Service for you.
        </P>
        <P>
          You represent and warrant that you have all rights necessary to submit Your Content and that doing so does not
          violate any law or the rights of any third party.
        </P>
        <P>
          We may collect and use aggregated and anonymized data derived from use of the Service (data that does not
          identify you or any individual) for any lawful purpose, including improving the Service.
        </P>
      </Section>

      <Section id="intellectual-property" title="11. Intellectual Property in the Service">
        <P>
          The Service, including its software, design, text, graphics, interfaces, and all related intellectual property
          (excluding Your Content and third-party Public Ad Data), is owned by us or our licensors and is protected by
          intellectual-property laws.
        </P>
        <P>
          Subject to your compliance with these Terms and payment of applicable fees, we grant you a limited,
          non-exclusive, non-transferable, revocable license to access and use the Service for your internal business or
          personal purposes during the term of your Subscription. We reserve all rights not expressly granted.
        </P>
        <P>
          You may not copy, modify, distribute, sell, lease, reverse engineer, decompile, or attempt to extract the source
          code of the Service, except to the extent such restriction is prohibited by applicable law.
        </P>
      </Section>

      <Section id="privacy" title="12. Privacy">
        <P>
          Our handling of personal data is described in our Privacy Policy, which forms part of these Terms. By using the
          Service you acknowledge that we process personal data as described there. We act as a data controller for the
          personal data we process to operate the Service and provide it to you, in accordance with the EU General Data
          Protection Regulation (GDPR) and applicable Lithuanian law.
        </P>
      </Section>

      <Section id="availability" title="13. Service Availability">
        <P>
          We aim to keep the Service available and reliable, but we do not guarantee uninterrupted, error-free, or secure
          operation. The Service may be temporarily unavailable due to maintenance, updates, technical issues, or factors
          outside our control, including the availability of third-party data sources and infrastructure. We are not
          liable for any unavailability of the Service.
        </P>
      </Section>

      <Section id="disclaimers" title="14. Disclaimers">
        <P>
          To the maximum extent permitted by applicable law, the Service and all Analytical Output and Public Ad Data are
          provided &quot;as is&quot; and &quot;as available,&quot; without warranties of any kind, whether express,
          implied, or statutory, including any implied warranties of merchantability, fitness for a particular purpose,
          accuracy, title, and non-infringement.
        </P>
        <P>
          We do not warrant that the Service will meet your requirements, that data will be complete or accurate, that
          insights will be correct, or that any results will be achieved through use of the Service. No advice or
          information obtained from us or through the Service creates any warranty not expressly stated in these Terms.
        </P>
        <P>
          Some jurisdictions do not allow the exclusion of certain warranties, so some of the above exclusions may not
          apply to you. Nothing in these Terms limits warranties or rights that cannot be excluded under applicable law.
        </P>
      </Section>

      <Section id="limitation-of-liability" title="15. Limitation of Liability">
        <P>To the maximum extent permitted by applicable law:</P>
        <Ul>
          <li>
            We, together with our operators, suppliers, and personnel, will not be liable for any indirect, incidental,
            special, consequential, exemplary, or punitive damages, or for any loss of profits, revenue, data, goodwill,
            or business opportunities, arising out of or related to your use of, or inability to use, the Service, even if
            we have been advised of the possibility of such damages.
          </li>
          <li>
            Our total aggregate liability arising out of or related to these Terms or the Service, for all claims combined,
            will not exceed the greater of (a) the total amount you paid us for the Service in the twelve (12) months
            immediately preceding the event giving rise to the liability, or (b) one hundred euros (€100).
          </li>
        </Ul>
        <P>
          These limitations apply regardless of the legal theory on which a claim is based. Nothing in these Terms excludes
          or limits liability that cannot lawfully be excluded or limited, including liability for death or personal injury
          caused by negligence, for fraud, or for any other liability that applicable law does not permit to be limited.
        </P>
      </Section>

      <Section id="indemnification" title="16. Indemnification">
        <P>
          You agree to indemnify, defend, and hold harmless Spy-Rival and its operators, personnel, and agents from and
          against any claims, liabilities, damages, losses, and expenses, including reasonable legal fees, arising out of
          or in any way connected with: (a) your use of the Service; (b) your violation of these Terms; (c) your violation
          of any law or the rights of any third party, including intellectual-property and privacy rights; or (d) Your
          Content. This section survives termination of these Terms.
        </P>
      </Section>

      <Section id="suspension-termination" title="17. Suspension and Termination">
        <P>You may stop using the Service and cancel your Subscription at any time as described in Section 6.</P>
        <P>
          We may suspend or terminate your access to the Service, in whole or in part, immediately and without notice,
          if: (a) you breach these Terms; (b) we are required to do so by law; (c) your use poses a security, legal, or
          operational risk to us or others; or (d) your payment fails and is not cured within a reasonable period.
        </P>
        <P>
          Upon termination, your right to use the Service ceases. Sections that by their nature should survive termination
          (including Sections 8, 9, 11, 14, 15, 16, 18, and 19) will survive. We may delete Your Content and Account data
          following termination in accordance with our data-retention practices and applicable law, and we are not liable
          for any such deletion.
        </P>
      </Section>

      <Section id="changes" title="18. Changes to These Terms">
        <P>
          We may update these Terms from time to time. If we make material changes, we will take reasonable steps to
          notify you, such as by email or by posting a notice within the Service or on spy-rival.com, and we will update
          the &quot;Last updated&quot; date above. Changes take effect when posted unless stated otherwise. Your continued
          use of the Service after changes take effect constitutes acceptance of the revised Terms. If you do not agree to
          the revised Terms, you must stop using the Service and may cancel your Subscription.
        </P>
      </Section>

      <Section id="governing-law" title="19. Governing Law and Disputes">
        <P>
          These Terms are governed by the laws of the Republic of Lithuania, without regard to its conflict-of-laws rules,
          and subject to any mandatory consumer-protection laws of your country of residence that apply to you.
        </P>
        <P>
          Any dispute arising out of or in connection with these Terms or the Service that cannot be resolved amicably
          will be subject to the jurisdiction of the competent courts of Lithuania, without prejudice to any mandatory
          right you may have as a consumer to bring proceedings in the courts of your place of residence.
        </P>
        <P>
          If you are a consumer in the European Union, you may also have the right to use the European Commission&apos;s
          Online Dispute Resolution platform to resolve disputes.
        </P>
      </Section>

      <Section id="general" title="20. General">
        <P>
          These Terms, together with our Privacy Policy and any plan-specific terms presented at the point of sale,
          constitute the entire agreement between you and us regarding the Service and supersede any prior agreements.
        </P>
        <P>
          If any provision of these Terms is found to be unenforceable, that provision will be limited or removed to the
          minimum extent necessary, and the remaining provisions will remain in full force and effect.
        </P>
        <P>
          Our failure to enforce any right or provision of these Terms will not be considered a waiver of that right or
          provision.
        </P>
        <P>
          You may not assign or transfer these Terms or your Account without our prior written consent. We may assign these
          Terms in connection with a merger, acquisition, reorganization, or sale of assets, or by operation of law.
        </P>
        <P>
          Nothing in these Terms creates any partnership, joint venture, agency, or employment relationship between you and
          us.
        </P>
      </Section>

      <Section id="contact" title="21. Contact">
        <P>If you have any questions about these Terms, you can contact us at:</P>
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
          These Terms of Service are provided as a general template tailored to the Rival service. They do not constitute
          legal advice. Before publishing, you should have them reviewed by a qualified lawyer to confirm they meet your
          specific legal and regulatory obligations, particularly regarding consumer rights, data protection, and the laws
          of the jurisdictions in which your customers reside.
        </P>
      </div>
    </>
  );
}
