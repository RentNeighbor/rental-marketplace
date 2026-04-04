"use client";

import { useState } from "react";
import AvailabilityCalendar from "./AvailabilityCalendar";
import RentalRequestForm from "./RentalRequestForm";

interface DateRange {
  start: string;
  end: string;
}

interface BlockedRange extends DateRange {
  id: string;
  reason: string | null;
}

interface RenterBookingWrapperProps {
  listingId: string;
  blockedRanges: BlockedRange[];
  bookedRanges: DateRange[];
  unavailableRanges: DateRange[];
  pricePerDay: number | null;
  pricePerWeek: number | null;
  securityDeposit: number | null;
  pricingMode?: string;
  identityVerified: boolean;
  submitAction: (formData: FormData) => Promise<{ checkoutUrl: string }>;
}

export default function RenterBookingWrapper({
  listingId,
  blockedRanges,
  bookedRanges,
  unavailableRanges,
  pricePerDay,
  pricePerWeek,
  securityDeposit,
  pricingMode,
  identityVerified,
  submitAction,
}: RenterBookingWrapperProps) {
  const [selStart, setSelStart] = useState("");
  const [selEnd, setSelEnd] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);

  async function startIdentityVerification() {
    setVerifying(true);
    setIdentityError(null);
    try {
      const res = await fetch("/api/stripe/identity", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start verification");
      window.location.href = data.url;
    } catch (e) {
      setIdentityError(e instanceof Error ? e.message : "Something went wrong");
      setVerifying(false);
    }
  }

  if (!identityVerified) {
    return (
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-900 mb-1">Identity verification required</h3>
            <p className="text-xs text-amber-700 mb-3">
              To protect owners, renters must verify their identity with a government-issued ID before making a rental request. This is a one-time step.
            </p>
            {identityError && (
              <p className="text-xs text-red-600 mb-2">{identityError}</p>
            )}
            <button
              onClick={startIdentityVerification}
              disabled={verifying}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {verifying ? "Starting verification..." : "Verify my identity"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Availability</h3>
        <p className="text-xs text-gray-400 mb-3">
          Click a start date then an end date to pre-fill the request form below.
        </p>
        <AvailabilityCalendar
          blockedRanges={blockedRanges}
          bookedRanges={bookedRanges}
          isOwner={false}
          onSelectRange={(start, end) => {
            setSelStart(start);
            setSelEnd(end);
          }}
        />
      </div>

      <RentalRequestForm
        listingId={listingId}
        pricePerDay={pricePerDay}
        pricePerWeek={pricePerWeek}
        securityDeposit={securityDeposit}
        pricingMode={pricingMode}
        unavailableRanges={unavailableRanges}
        initialStart={selStart || undefined}
        initialEnd={selEnd || undefined}
        submitAction={submitAction}
      />
    </div>
  );
}
