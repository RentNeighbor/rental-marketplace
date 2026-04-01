"use client";

import { useActionState, useState } from "react";

const REASONS = [
  { value: "spam", label: "Spam or fake listing" },
  { value: "prohibited_item", label: "Prohibited or illegal item" },
  { value: "misleading", label: "Misleading or inaccurate" },
  { value: "scam", label: "Suspected scam" },
  { value: "duplicate", label: "Duplicate listing" },
  { value: "other", label: "Other" },
];

interface ReportButtonProps {
  listingId: string;
  submitAction: (formData: FormData) => Promise<void>;
}

export default function ReportButton({
  listingId,
  submitAction,
}: ReportButtonProps) {
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function formAction(_prevState: string | null, formData: FormData) {
    try {
      await submitAction(formData);
      setSubmitted(true);
      setShowForm(false);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Something went wrong";
    }
  }

  const [error, action, isPending] = useActionState(formAction, null);

  if (submitted) {
    return (
      <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
        <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Report submitted. Thank you.
      </p>
    );
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setShowForm(!showForm)}
        className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5"
          />
        </svg>
        {showForm ? "Cancel" : "Report this listing"}
      </button>

      {showForm && (
        <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-2.5 rounded text-xs mb-3">
              {error}
            </div>
          )}

          <form action={action} className="space-y-3">
            <input type="hidden" name="listingId" value={listingId} />

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Reason
              </label>
              <select
                name="reason"
                required
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <option value="">Select a reason</option>
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Details (optional)
              </label>
              <textarea
                name="details"
                rows={2}
                placeholder="Provide any additional context..."
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Submitting..." : "Submit Report"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
