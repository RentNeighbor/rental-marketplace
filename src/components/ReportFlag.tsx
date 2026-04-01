"use client";

import { useState } from "react";

const REASONS = [
  { value: "spam", label: "Spam / fake" },
  { value: "prohibited_item", label: "Prohibited item" },
  { value: "misleading", label: "Misleading" },
  { value: "scam", label: "Scam" },
  { value: "duplicate", label: "Duplicate" },
  { value: "other", label: "Other" },
];

export default function ReportFlag({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("listingId", listingId);

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit report");
      } else {
        setDone(true);
        setTimeout(() => setOpen(false), 1500);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="absolute top-1.5 right-1.5 z-10 bg-white rounded-md px-2 py-1 shadow-sm border border-gray-200">
        <span className="text-[10px] text-green-600">Reported</span>
      </div>
    );
  }

  return (
    <div className="absolute top-1.5 right-1.5 z-10">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        className="bg-white/80 hover:bg-white rounded-full p-1 shadow-sm border border-gray-200 text-gray-400 hover:text-red-500 transition-colors"
        title="Report listing"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5"
          />
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-8 right-0 w-52 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20"
          onClick={(e) => e.stopPropagation()}
        >
          {error && (
            <p className="text-[10px] text-red-600 mb-2">{error}</p>
          )}
          <form onSubmit={handleSubmit}>
            <select
              name="reason"
              required
              className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-700 mb-2 focus:outline-none focus:ring-1 focus:ring-red-400"
            >
              <option value="">Reason...</option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded bg-red-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "..." : "Report"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
