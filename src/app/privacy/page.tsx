import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for RentNeighbors.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: April 4, 2026</p>

      <div className="prose prose-sm prose-gray max-w-none space-y-6 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-0">
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
            For questions about this Privacy Policy or our{" "}
            <a href="/terms" className="text-green-700 hover:underline">
              Terms of Service
            </a>
            , contact us at{" "}
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
