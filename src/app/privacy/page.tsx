import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Privacy",
  description: "How RentNeighbors collects, stores, and uses your data.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Privacy</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: April 4, 2026</p>

      <div className="prose prose-sm prose-gray max-w-none space-y-6 text-sm text-gray-700 leading-relaxed">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-800 font-medium">
            We will never sell, rent, or trade your personal data to third parties. Period.
          </p>
        </div>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-0">
            What Data We Collect
          </h2>

          <h3 className="text-sm font-semibold text-gray-800 mt-4">Account Data</h3>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden mt-2">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500">
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Purpose</th>
                <th className="px-3 py-2 font-medium">Storage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-3 py-2">Name</td>
                <td className="px-3 py-2">Profile display, communications</td>
                <td className="px-3 py-2">Our database (Neon PostgreSQL)</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Email address</td>
                <td className="px-3 py-2">Login, notifications, verification</td>
                <td className="px-3 py-2">Our database</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Password</td>
                <td className="px-3 py-2">Authentication</td>
                <td className="px-3 py-2">Stored as a bcrypt hash &mdash; we never store your actual password</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Location</td>
                <td className="px-3 py-2">Showing nearby listings</td>
                <td className="px-3 py-2">Our database (city/neighborhood level only)</td>
              </tr>
            </tbody>
          </table>

          <h3 className="text-sm font-semibold text-gray-800 mt-4">Listing Data</h3>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden mt-2">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500">
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Purpose</th>
                <th className="px-3 py-2 font-medium">Storage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-3 py-2">Item title, description, condition</td>
                <td className="px-3 py-2">Displaying your listing</td>
                <td className="px-3 py-2">Our database</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Photos</td>
                <td className="px-3 py-2">Displaying your listing</td>
                <td className="px-3 py-2">Vercel Blob (cloud storage)</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Pricing</td>
                <td className="px-3 py-2">Rental transactions</td>
                <td className="px-3 py-2">Our database</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Location</td>
                <td className="px-3 py-2">Distance calculations, search</td>
                <td className="px-3 py-2">Our database (coordinates + city name)</td>
              </tr>
            </tbody>
          </table>

          <h3 className="text-sm font-semibold text-gray-800 mt-4">Data Handled by Third Parties</h3>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden mt-2">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500">
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Provider</th>
                <th className="px-3 py-2 font-medium">What We Store</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-3 py-2">Credit/debit card details</td>
                <td className="px-3 py-2">Stripe</td>
                <td className="px-3 py-2">Nothing &mdash; Stripe handles all card data. We only store Stripe customer/account IDs.</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Government-issued ID</td>
                <td className="px-3 py-2">Stripe Identity</td>
                <td className="px-3 py-2">Nothing &mdash; Stripe processes and stores ID documents. We only store a verification status (verified or not).</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Google account info (if using Google login)</td>
                <td className="px-3 py-2">Google OAuth</td>
                <td className="px-3 py-2">Name and email only</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            What We Do NOT Collect
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>We do not track you across other websites</li>
            <li>We do not use advertising cookies or tracking pixels</li>
            <li>We do not collect your browsing history</li>
            <li>We do not store your payment card numbers</li>
            <li>We do not store your government ID documents</li>
            <li>We do not collect your precise home address</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            How Your Data Is Protected
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Encryption in transit:</strong> All data is transmitted over HTTPS (TLS)</li>
            <li><strong>Password hashing:</strong> Passwords are hashed with bcrypt before storage &mdash; they cannot be reversed</li>
            <li><strong>Session security:</strong> Sessions use signed JWT tokens with 7-day expiry</li>
            <li><strong>Database security:</strong> Hosted on Neon PostgreSQL with encrypted connections and access controls</li>
            <li><strong>Payment security:</strong> All payment processing is handled by Stripe, a PCI Level 1 certified provider</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Who Can See Your Data
          </h2>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden mt-2">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500">
                <th className="px-3 py-2 font-medium">Who</th>
                <th className="px-3 py-2 font-medium">What They See</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-3 py-2">Other users</td>
                <td className="px-3 py-2">Your name, listings, reviews, and public profile</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Users you message</td>
                <td className="px-3 py-2">Your name and message content</td>
              </tr>
              <tr>
                <td className="px-3 py-2">RentNeighbors admins</td>
                <td className="px-3 py-2">All account data (for moderation and dispute resolution)</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Stripe</td>
                <td className="px-3 py-2">Payment and identity verification data</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Resend</td>
                <td className="px-3 py-2">Your email address (for sending transactional emails)</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3">
            <strong>Your email address is never shown to other users.</strong> All communication happens through the in-app messaging system.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Data Retention
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Active accounts:</strong> Data is retained as long as your account is active</li>
            <li><strong>Deleted accounts:</strong> Account data is deleted upon request. Transaction records may be retained for legal and tax purposes</li>
            <li><strong>Messages:</strong> Retained as long as both users&apos; accounts are active</li>
            <li><strong>Listing photos:</strong> Deleted when a listing is permanently removed</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Your Rights
          </h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Access</strong> all personal data we hold about you</li>
            <li><strong>Correct</strong> any inaccurate information</li>
            <li><strong>Delete</strong> your account and associated data</li>
            <li><strong>Export</strong> your data in a portable format</li>
            <li><strong>Opt out</strong> of non-essential emails via your notification settings</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, email{" "}
            <a
              href="mailto:privacy@rentneighbors.com"
              className="text-green-700 hover:underline"
            >
              privacy@rentneighbors.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Changes to This Policy
          </h2>
          <p>
            If we make material changes to how we handle your data, we will notify you via email and update this page. We will never start selling data or fundamentally change how your information is used without clear notice.
          </p>
        </section>
      </div>
    </div>
  );
}
