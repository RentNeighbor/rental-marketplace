"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-6xl font-bold text-gray-900">500</h1>
      <p className="mt-3 text-lg text-gray-600">Something went wrong</p>
      <p className="mt-1 text-sm text-gray-400">An unexpected error occurred. Please try again.</p>
      <button
        onClick={reset}
        className="mt-6 inline-block rounded bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        Try Again
      </button>
    </div>
  );
}
