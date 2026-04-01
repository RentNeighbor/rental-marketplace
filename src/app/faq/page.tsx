import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — RentNeighbor",
  description: "Frequently asked questions about renting and listing items on RentNeighbor.",
};

const faqs = [
  {
    section: "Getting Started",
    questions: [
      {
        q: "What is RentNeighbor?",
        a: "RentNeighbor is a hyperlocal peer-to-peer rental marketplace. It connects neighbors who own things they rarely use with people nearby who need them — tools, camping gear, party supplies, electronics, sporting equipment, and more.",
      },
      {
        q: "How does it work?",
        a: "Owners list items with photos, pricing, and availability. Renters browse, search, and book items nearby. You meet in person to exchange the item. Payments are handled securely through Stripe.",
      },
      {
        q: "Is RentNeighbor free to use?",
        a: "Creating an account and browsing listings is free. When a rental transaction occurs, a 10% platform fee is applied to the rental price. Owners receive 90% of the rental fee.",
      },
      {
        q: "Do I need to verify my email?",
        a: "Yes. You can browse listings without verifying, but you must verify your email before posting listings, booking rentals, or placing bids.",
      },
    ],
  },
  {
    section: "For Renters",
    questions: [
      {
        q: "How do I rent an item?",
        a: "Find an item you need, select your rental dates, and complete checkout through Stripe. The owner will approve your request, and you'll arrange a pickup time.",
      },
      {
        q: "What is a security deposit?",
        a: "Some owners require a refundable security deposit to cover potential damage. The deposit amount is listed on the item page. It's returned when the item comes back in good condition.",
      },
      {
        q: "Can I make a custom offer?",
        a: "Yes. You can place a bid with your preferred dates and price. The owner can accept or decline your offer.",
      },
      {
        q: "What if the item isn't as described?",
        a: "You can file a dispute from the listing page. We encourage both parties to take check-in and check-out photos to document the item's condition.",
      },
      {
        q: "How do I cancel a rental?",
        a: "You can cancel a pending rental from your dashboard. If you've already paid, a refund will be processed automatically.",
      },
      {
        q: "Do I need identity verification?",
        a: "Yes. Before your first booking, you'll need to complete identity verification through Stripe Identity. This is a one-time process that helps keep the community safe.",
      },
    ],
  },
  {
    section: "For Owners",
    questions: [
      {
        q: "How do I list an item?",
        a: "Click \"Post a Listing\" in the navigation bar. Add a title, description, photos (up to 5), pricing, location, and condition. Your listing will be live immediately.",
      },
      {
        q: "How do I get paid?",
        a: "Payments are processed through Stripe Connect. You'll set up a connected account in your payout settings. After a rental is completed, your share (90% of the rental fee) is transferred to your account.",
      },
      {
        q: "Can I set daily and weekly pricing?",
        a: "Yes. You can set a price per day, price per week, or both. When both are set, the system automatically calculates the best rate for the renter based on the rental duration.",
      },
      {
        q: "How do I block dates?",
        a: "On your listing page, use the availability calendar to block date ranges when the item isn't available. You can add an optional reason for each blocked period.",
      },
      {
        q: "What if a renter damages my item?",
        a: "Take check-out photos when the item is returned. If there's damage, you can file a dispute. The security deposit (if set) helps cover damage costs.",
      },
      {
        q: "Can I pause my listing?",
        a: "Yes. Edit your listing and change the status to \"Paused.\" This hides it from search without deleting it. You can reactivate it anytime.",
      },
    ],
  },
  {
    section: "Payments & Pricing",
    questions: [
      {
        q: "What payment methods are accepted?",
        a: "We accept all major credit and debit cards through Stripe's secure checkout.",
      },
      {
        q: "How is the rental price calculated?",
        a: "The price is based on the number of rental days and the owner's pricing. If a weekly rate is available and the rental is 7+ days, the weekly rate is used. A 10% platform fee is added to the rental price.",
      },
      {
        q: "When do refunds happen?",
        a: "Refunds are processed automatically when an owner declines a rental request, when a renter cancels a pending rental, or when a date conflict is detected.",
      },
    ],
  },
  {
    section: "Trust & Safety",
    questions: [
      {
        q: "How do I report a listing?",
        a: "Click the flag icon on any listing card, or use the \"Report\" button on the listing detail page. Select a reason and we'll review it.",
      },
      {
        q: "How do reviews work?",
        a: "After a rental, both the renter and owner can leave a 1-5 star review with an optional comment. Reviews are visible on the listing page and user profiles.",
      },
      {
        q: "What happens if I have a dispute?",
        a: "You can file a dispute from the listing page for issues like unreturned deposits, false damage claims, or items not matching their description. Our team reviews disputes and works toward a resolution.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Frequently Asked Questions
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Everything you need to know about renting and listing on RentNeighbor.
      </p>

      <div className="space-y-10">
        {faqs.map((section) => (
          <div key={section.section}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
              {section.section}
            </h2>
            <div className="space-y-4">
              {section.questions.map((faq) => (
                <div key={faq.q}>
                  <h3 className="text-sm font-medium text-gray-800">
                    {faq.q}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 border-t border-gray-200 pt-6">
        <p className="text-sm text-gray-500">
          Still have questions? Message us through the platform or email{" "}
          <a
            href="mailto:support@rentneighbor.com"
            className="text-green-700 hover:underline"
          >
            support@rentneighbor.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}
