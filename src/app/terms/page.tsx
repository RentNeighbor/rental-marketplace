import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — RentNeighbors",
  description: "Terms of Service and Privacy Policy for RentNeighbors.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Terms of Service
      </h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: April 1, 2026</p>

      <div className="prose prose-sm prose-gray max-w-none space-y-6 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-0">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using RentNeighbors (&quot;the Platform&quot;), you agree to be
            bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to
            these Terms, do not use the Platform. We may update these Terms from
            time to time, and continued use of the Platform after changes
            constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            2. Description of Service
          </h2>
          <p>
            RentNeighbors is a peer-to-peer rental marketplace that connects
            individuals who want to rent out personal items (&quot;Owners&quot;) with
            individuals who want to rent those items (&quot;Renters&quot;). RentNeighbors
            provides the platform and payment processing infrastructure but is
            not a party to any rental agreement between Owners and Renters.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            3. Account Registration
          </h2>
          <p>
            To use certain features of the Platform, you must create an account.
            You agree to provide accurate, current, and complete information
            during registration, maintain the security of your password, and
            accept responsibility for all activities under your account. You must
            verify your email address before posting listings or initiating
            rentals. You must be at least 18 years old to create an account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            4. Identity Verification
          </h2>
          <p>
            Before making your first rental booking, you are required to
            complete identity verification through our third-party provider
            (Stripe Identity). This process involves submitting a
            government-issued photo ID. Identity verification helps maintain
            trust and safety within the community.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            5. Listings and Rentals
          </h2>
          <p>
            Owners are responsible for the accuracy of their listings, including
            descriptions, photos, pricing, and availability. Owners must only
            list items they legally own or have authority to rent.
          </p>
          <p className="mt-2 font-medium">
            The following items may not be listed on RentNeighbor:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>Weapons, firearms, ammunition, or explosives</li>
            <li>Illegal drugs, drug paraphernalia, or controlled substances</li>
            <li>Stolen, counterfeit, or recalled products</li>
            <li>Hazardous materials (chemicals, flammables, radioactive materials)</li>
            <li>Medical devices requiring a prescription or license</li>
            <li>Vehicles without valid registration or insurance</li>
            <li>Items that violate intellectual property rights</li>
            <li>Adult or sexually explicit content</li>
            <li>Living animals</li>
            <li>Items prohibited by federal, state, or local law</li>
          </ul>
          <p className="mt-2">
            Listings that violate these restrictions will be removed and may
            result in account suspension.
          </p>
          <p className="mt-2">
            Renters agree to use rented items responsibly, return them on time
            and in the same condition as received (normal wear and tear
            excepted), and communicate promptly with Owners regarding any
            issues.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            6. Payments and Fees
          </h2>
          <p>
            All payments are processed securely through Stripe. A 10% platform
            fee is applied to each rental transaction. Owners receive 90% of the
            rental fee via Stripe Connect. Security deposits, if required by the
            Owner, are collected at checkout and refunded upon satisfactory
            return of the item.
          </p>
          <p>
            Refunds are issued automatically when a rental request is declined,
            cancelled before approval, or when a date conflict is detected. For
            other refund requests, contact support.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            7. Prohibited Conduct
          </h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the Platform for any illegal purpose</li>
            <li>List stolen, counterfeit, or prohibited items</li>
            <li>Misrepresent the condition or description of items</li>
            <li>
              Harass, threaten, or engage in abusive behavior toward other users
            </li>
            <li>
              Attempt to circumvent the Platform&apos;s payment system to avoid fees
            </li>
            <li>Create multiple accounts to evade suspension or bans</li>
            <li>
              Interfere with or disrupt the Platform&apos;s operation or security
            </li>
            <li>Scrape, crawl, or collect data from the Platform without permission</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            8. Disputes and Resolution
          </h2>
          <p>
            We encourage Owners and Renters to resolve disputes directly. When
            direct resolution is not possible, either party may file a dispute
            through the Platform. We review disputes based on available evidence
            including condition photos, messages, and transaction records.
            RentNeighbors&apos;s dispute resolution is provided as a courtesy and our
            decisions are not legally binding arbitration.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            9. Content and Intellectual Property
          </h2>
          <p>
            You retain ownership of content you post (photos, descriptions,
            reviews). By posting content, you grant RentNeighbors a
            non-exclusive, worldwide, royalty-free license to use, display, and
            distribute that content in connection with the Platform&apos;s operation.
            You represent that you have the right to post all content you
            submit.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            10. Account Suspension and Termination
          </h2>
          <p>
            We may suspend or terminate your account if you violate these Terms,
            engage in prohibited conduct, or if we receive verified reports of
            misconduct. Suspended users will be notified and may not create new
            accounts. You may delete your account at any time by contacting
            support.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            11. Limitation of Liability
          </h2>
          <p>
            RentNeighbors is a marketplace platform and does not own, inspect, or
            guarantee any items listed. We are not liable for the condition,
            safety, legality, or quality of listed items, the accuracy of
            listings or user content, any damage, loss, or injury arising from
            rental transactions, or any disputes between Owners and Renters. The
            Platform is provided &quot;as is&quot; without warranties of any kind.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            12. Indemnification
          </h2>
          <p>
            You agree to indemnify and hold harmless RentNeighbors, its officers,
            employees, and affiliates from any claims, damages, losses, or
            expenses arising from your use of the Platform, violation of these
            Terms, or your rental transactions with other users.
          </p>
        </section>

        <hr className="border-gray-200 my-8" />

        <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Information We Collect
          </h2>
          <p>We collect information you provide directly:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Account information:</strong> Name, email address,
              password (stored as a bcrypt hash)
            </li>
            <li>
              <strong>Listing information:</strong> Item descriptions, photos,
              pricing, location
            </li>
            <li>
              <strong>Identity verification:</strong> Government-issued ID
              processed by Stripe Identity (we do not store your ID documents)
            </li>
            <li>
              <strong>Payment information:</strong> Processed and stored by
              Stripe (we do not store card numbers)
            </li>
            <li>
              <strong>Communications:</strong> Messages between users, reviews,
              and reports
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            How We Use Your Information
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide and improve the Platform</li>
            <li>To process rental transactions and payments</li>
            <li>To send transactional emails (booking confirmations, verification, password resets)</li>
            <li>To verify your identity and prevent fraud</li>
            <li>To resolve disputes and enforce our Terms</li>
            <li>To display your public profile, listings, and reviews to other users</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Information Sharing
          </h2>
          <p>
            We do not sell your personal information. We share information only
            with:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Stripe:</strong> For payment processing and identity
              verification
            </li>
            <li>
              <strong>Resend:</strong> For transactional email delivery
            </li>
            <li>
              <strong>Other users:</strong> Your name, listings, reviews, and
              public profile are visible to other users
            </li>
            <li>
              <strong>Law enforcement:</strong> When required by law or to
              protect the safety of our users
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Data Security
          </h2>
          <p>
            We implement security measures including password hashing (bcrypt),
            HTTPS encryption, secure HTTP headers, and JWT-based session
            management. However, no method of transmission over the internet is
            100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Your Rights
          </h2>
          <p>
            You may request access to, correction of, or deletion of your
            personal information by contacting us at{" "}
            <a
              href="mailto:privacy@rentneighbors.com"
              className="text-green-700 hover:underline"
            >
              privacy@rentneighbors.com
            </a>
            . You may update your notification preferences at any time in your
            account settings.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Contact
          </h2>
          <p>
            For questions about these Terms or our Privacy Policy, contact us at{" "}
            <a
              href="mailto:support@rentneighbors.com"
              className="text-green-700 hover:underline"
            >
              support@rentneighbors.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
