"use client";

import { useActionState, useState, useEffect } from "react";

interface DateRange {
  start: string;
  end: string;
}

interface RentalRequestFormProps {
  listingId: string;
  pricePerDay: number | null;
  pricePerWeek: number | null;
  securityDeposit: number | null;
  pricingMode?: string;
  unavailableRanges?: DateRange[];
  initialStart?: string;
  initialEnd?: string;
  submitAction: (formData: FormData) => Promise<void | { checkoutUrl: string }>;
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd;
}

export default function RentalRequestForm({
  listingId,
  pricePerDay,
  pricePerWeek,
  securityDeposit,
  pricingMode = "pre_fee",
  unavailableRanges = [],
  initialStart,
  initialEnd,
  submitAction,
}: RentalRequestFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (initialStart) {
      setStartDate(initialStart);
      setShowForm(true);
    }
    if (initialEnd) setEndDate(initialEnd);
  }, [initialStart, initialEnd]);

  const today = new Date().toISOString().split("T")[0];

  // Calculate price preview
  let pricePreview: string | null = null;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days > 0) {
      if (pricePerDay) {
        const baseFee = pricePerDay * days;
        const renterPays = pricingMode === "pre_fee"
          ? Math.round(baseFee / 0.9 * 100) / 100
          : baseFee;
        pricePreview = `$${renterPays.toFixed(2)} (${days} day${days !== 1 ? "s" : ""})`;
      } else if (pricePerWeek) {
        const weeks = Math.ceil(days / 7);
        const baseFee = pricePerWeek * weeks;
        const renterPays = pricingMode === "pre_fee"
          ? Math.round(baseFee / 0.9 * 100) / 100
          : baseFee;
        pricePreview = `$${renterPays.toFixed(2)} (${weeks} week${weeks !== 1 ? "s" : ""})`;
      }
    }
  }

  // Client-side overlap check
  const dateConflict =
    startDate && endDate
      ? unavailableRanges.some((r) => rangesOverlap(startDate, endDate, r.start, r.end))
      : false;

  type FormState = { error?: string; checkoutUrl?: string } | null;

  async function formAction(_prevState: FormState, formData: FormData): Promise<FormState> {
    try {
      const result = await submitAction(formData);
      if (result && "checkoutUrl" in result) {
        return { checkoutUrl: result.checkoutUrl };
      }
      setShowForm(false);
      return null;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Something went wrong" };
    }
  }

  const [state, action, isPending] = useActionState(formAction, null);
  const error = state?.error;

  useEffect(() => {
    if (state?.checkoutUrl) {
      window.location.href = state.checkoutUrl;
    }
  }, [state?.checkoutUrl]);

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Request to Rent
      </button>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">
        Request Rental Dates
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
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {dateConflict && (
          <div className="bg-red-50 text-red-700 p-2.5 rounded text-xs">
            Selected dates overlap with unavailable or booked dates. Please choose different dates.
          </div>
        )}

        {pricePreview && !dateConflict && (
          <div className="bg-white rounded-md border border-blue-100 p-3 space-y-1">
            <p className="text-sm font-medium text-gray-900">{pricePreview}</p>
            {(() => {
              if (!startDate || !endDate) return null;
              const start = new Date(startDate);
              const end = new Date(endDate);
              const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
              if (days <= 0) return null;
              let baseRentalFee = 0;
              if (pricePerDay) {
                baseRentalFee = pricePerDay * days;
              } else if (pricePerWeek) {
                baseRentalFee = pricePerWeek * Math.ceil(days / 7);
              }
              // pre_fee: listed price = what owner receives, renter pays more
              // post_fee: listed price = what renter pays, owner gets less
              const renterPays = pricingMode === "pre_fee"
                ? Math.round(baseRentalFee / 0.9 * 100) / 100
                : baseRentalFee;
              const platformFee = Math.round(renterPays * 0.10 * 100) / 100;
              const ownerReceives = renterPays - platformFee;
              const totalWithDeposit = renterPays + (securityDeposit ?? 0);
              return (
                <>
                  <div className="text-xs text-gray-500 border-t border-gray-100 pt-1 mt-1 space-y-0.5">
                    <p>You pay: ${renterPays.toFixed(2)}</p>
                    <p>Platform fee (10%): ${platformFee.toFixed(2)}</p>
                    <p>Owner receives: ${ownerReceives.toFixed(2)}</p>
                  </div>
                  {securityDeposit ? (
                    <p className="text-xs text-amber-600">
                      + ${securityDeposit} refundable deposit &middot; Total: ${totalWithDeposit.toFixed(2)}
                    </p>
                  ) : null}
                </>
              );
            })()}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending || dateConflict}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Redirecting to payment..." : "Pay & Request"}
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
