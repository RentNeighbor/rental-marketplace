import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-6xl font-bold text-gray-900">404</h1>
      <p className="mt-3 text-lg text-gray-600">Page not found</p>
      <p className="mt-1 text-sm text-gray-400">The page you're looking for doesn't exist or has been moved.</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        Back to Home
      </Link>
    </div>
  );
}
