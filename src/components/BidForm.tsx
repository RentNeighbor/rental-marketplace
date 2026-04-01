"use client";

import { useActionState, useState } from "react";

interface DateRange {
  start: string;
  end: string;
}

interface BidFormProps {
  listingId: string;
  pricePerDay: number | null;
  pricePerWeek: number | null;
  unavailableRanges?: DateRange[];
  submitAction: (formData: FormData) => Promise<void>;
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd;
}

export default function BidForm({
  listingId,
  pricePerDay,
  pricePerWeek,
  unavailableRanges = [],
  submitAction,
}: BidFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [amount, setAmount] = useState("");

  const today = new Date().toISOString().split("T")[0];

  // Calculate suggested price for reference
  let suggestedPrice: string | null = null;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days > 0) {
      if (pricePerDay) {
        suggestedPrice = `Listed price: $${(pricePerDay * days).toFixed(2)} (${days} day${days !== 1 ? "s" : ""} × $${pricePerDay}/day)`;
      } else if (pricePerWeek) {
        const weeks = Math.ceil(days / 7);
        suggestedPrice = `Listed price: $${(pricePerWeek * weeks).toFixed(2)} (${weeks} week${weeks !== 1 ? "s" : ""} × $${pricePerWeek}/week)`;
      }
    }
  }

  const dateConflict =
    startDate && endDate
      ? unavailableRanges.some((r) => rangesOverlap(startDate, endDate, r.start, r.end))
      : false;

  async function formAction(_prevState: string | null, formData: FormData) {
    try {
      await submitAction(formData);
      setShowForm(false);
      setStartDate("");
      setEndDate("");
      setAmount("");
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Something went wrong";
    }
  }

  const [error, action, isPending] = useActionState(formAction, null);

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="w-full rounded-lg bg-amber-600 px-6 py-3 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
      >
        Make an Offer
      </button>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">
        Make an Offer
      </h3>

      {error && (
        <div className="bg-red-50 text-red-700 p-2.5 rounded text-xs mb-3">
          {error}
        </div>
      )}

      <form action={action} className="space-y-3">
        <input type="hidden" name="listingId" value={listingId} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              required
              min={today}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              End Date
            </label>
            <input
              type="date"
              name="endDate"
              required
              min={startDate || today}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {dateConflict && (
          <div className="bg-red-50 text-red-700 p-2.5 rounded text-xs">
            Selected dates overlap with unavailable or booked dates. Please choose different dates.
          </div>
        )}

        {suggestedPrice && !dateConflict && (
          <p className="text-xs text-gray-500">{suggestedPrice}</p>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Your Offer (total for the period)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
            <input
              type="number"
              name="amount"
              required
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-md border border-gray-200 bg-white pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Message (optional)
          </label>
          <textarea
            name="message"
            rows={2}
            placeholder="Tell the owner why you'd like to rent this..."
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending || dateConflict}
            className="flex-1 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Submitting..." : "Submit Offer"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
