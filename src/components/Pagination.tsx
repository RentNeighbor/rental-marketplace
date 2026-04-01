"use client";

import { useRouter, useSearchParams } from "next/navigation";

const PER_PAGE_OPTIONS = [10, 20, 50, 100];

interface PaginationProps {
  totalResults: number;
  currentPage: number;
  perPage: number;
}

export default function Pagination({
  totalResults,
  currentPage,
  perPage,
}: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(totalResults / perPage);

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    return `/?${params.toString()}`;
  }

  function navigate(overrides: Record<string, string>) {
    router.push(buildUrl(overrides));
  }

  function handlePerPage(val: number) {
    navigate({ perPage: String(val), page: "1" });
  }

  function handlePage(p: number) {
    navigate({ page: String(p) });
  }

  // Compute visible page numbers (window of 5 around current)
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, totalResults);

  return (
    <div className="flex flex-col items-center gap-4 mt-8">
      {/* Results count + per-page selector */}
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>
          {totalResults === 0
            ? "0 results"
            : `${start}–${end} of ${totalResults}`}
        </span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-400">Show</span>
        <div className="flex gap-1">
          {PER_PAGE_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => handlePerPage(n)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                perPage === n
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {pages.map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => handlePage(p as number)}
                className={`min-w-[32px] h-8 rounded-md text-sm font-medium transition-colors ${
                  currentPage === p
                    ? "bg-green-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => handlePage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
