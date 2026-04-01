import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-6">
        <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment confirmed</h1>
      <p className="text-gray-500 text-sm mb-8">
        Your rental request has been sent to the owner. You&apos;ll get a notification
        when they approve or decline.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/dashboard"
          className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
        >
          View my rentals
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back to listings
        </Link>
      </div>
    </div>
  );
}
