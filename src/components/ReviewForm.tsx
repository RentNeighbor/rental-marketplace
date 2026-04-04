"use client";

import { useActionState, useState } from "react";

interface ReviewFormProps {
  listingId: string;
  revieweeId: string;
  revieweeName: string;
  role: "renter" | "owner";
  submitAction: (formData: FormData) => Promise<{ error?: string }>;
}

export default function ReviewForm({
  listingId,
  revieweeId,
  revieweeName,
  role,
  submitAction,
}: ReviewFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  async function formAction(_prevState: string | null, formData: FormData) {
    const result = await submitAction(formData);
    if (result?.error) {
      return result.error;
    }
    setSubmitted(true);
    setShowForm(false);
    return null;
  }

  const [error, action, isPending] = useActionState(formAction, null);

  if (submitted) {
    return (
      <p className="text-xs text-gray-400 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Review submitted. Thank you.
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowForm(!showForm)}
        className="text-xs text-green-600 hover:text-green-700 transition-colors flex items-center gap-1 font-medium"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
        </svg>
        {showForm ? "Cancel" : `Leave a review for ${revieweeName}`}
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
            <input type="hidden" name="revieweeId" value={revieweeId} />
            <input type="hidden" name="role" value={role} />
            <input type="hidden" name="rating" value={rating} />

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Rating
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    className="p-0.5"
                  >
                    <svg
                      className={`w-6 h-6 transition-colors ${
                        star <= (hover || rating)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                      />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Comment (optional)
              </label>
              <textarea
                name="comment"
                rows={2}
                placeholder="How was your experience?"
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <button
              type="submit"
              disabled={isPending || rating === 0}
              className="rounded-md bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Submitting..." : "Submit Review"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
