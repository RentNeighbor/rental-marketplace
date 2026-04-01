"use client";

import { useActionState, useState } from "react";

const REASONS = [
  { value: "deposit_not_returned", label: "Deposit not returned" },
  { value: "false_damage_claim", label: "False damage claim by owner" },
  { value: "item_not_as_described", label: "Item was not as described" },
  { value: "other", label: "Other" },
];

interface DisputeButtonProps {
  listingId: string;
  hasOpenDispute: boolean;
  submitAction: (formData: FormData) => Promise<void>;
}

export default function DisputeButton({
  listingId,
  hasOpenDispute,
  submitAction,
}: DisputeButtonProps) {
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

  if (hasOpenDispute || submitted) {
    return (
      <div className="mt-4 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        {submitted
          ? "Dispute submitted. Both parties' condition photos will be reviewed."
          : "You have an open dispute on this listing."}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setShowForm(!showForm)}
        className="text-xs text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z" />
        </svg>
        {showForm ? "Cancel" : "Dispute deposit"}
      </button>

      {showForm && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-xs text-amber-700 mb-3">
            If you believe the security deposit is being unfairly withheld, file
            a dispute. The condition photos submitted by both parties will serve
            as evidence.
          </p>

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
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
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
                Details
              </label>
              <textarea
                name="details"
                rows={3}
                required
                placeholder="Describe what happened and why you believe the deposit should be returned..."
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-amber-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Submitting..." : "File Dispute"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
