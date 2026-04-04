"use client";

import { useState } from "react";
import FilterPanel from "./FilterPanel";

interface Category {
  id: number;
  name: string;
  slug: string;
}

export default function MobileFilterToggle({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden mb-4">
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm active:bg-gray-50"
      >
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
        </svg>
        Filters & Sort
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-gray-50 rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-xl animate-slide-up">
            <div className="sticky top-0 bg-gray-50 px-5 pt-3 pb-2 border-b border-gray-200 flex items-center justify-between z-10">
              <h2 className="font-semibold text-gray-900 text-sm">Filters</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-green-600 active:text-green-700 px-2 py-1"
              >
                Done
              </button>
            </div>
            <div className="pb-8">
              <FilterPanel categories={categories} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
