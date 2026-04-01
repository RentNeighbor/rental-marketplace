"use client";

import { useState } from "react";
import AvailabilityCalendar from "./AvailabilityCalendar";
import BlockDatesForm from "./BlockDatesForm";

interface DateRange {
  start: string;
  end: string;
}

interface BlockedRange extends DateRange {
  id: string;
  reason: string | null;
}

interface AvailabilitySectionProps {
  listingId: string;
  blockedRanges: BlockedRange[];
  bookedRanges: DateRange[];
  isOwner: boolean;
  blockAction: (formData: FormData) => Promise<void>;
  unblockAction: (formData: FormData) => Promise<void>;
}

export default function AvailabilitySection({
  listingId,
  blockedRanges,
  bookedRanges,
  isOwner,
  blockAction,
  unblockAction,
}: AvailabilitySectionProps) {
  const [selectedStart, setSelectedStart] = useState("");
  const [selectedEnd, setSelectedEnd] = useState("");

  function handleSelectRange(start: string, end: string) {
    setSelectedStart(start);
    setSelectedEnd(end);
  }

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Availability Calendar
      </h3>

      <AvailabilityCalendar
        blockedRanges={blockedRanges}
        bookedRanges={bookedRanges}
        isOwner={isOwner}
        onSelectRange={isOwner ? handleSelectRange : undefined}
      />

      {isOwner && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Block Dates
          </h4>
          <p className="text-xs text-gray-500 mb-3">
            Click two dates on the calendar to select a range, or use the inputs below.
          </p>
          <BlockDatesForm
            listingId={listingId}
            blockedRanges={blockedRanges}
            selectedStart={selectedStart}
            selectedEnd={selectedEnd}
            blockAction={blockAction}
            unblockAction={unblockAction}
          />
        </div>
      )}
    </div>
  );
}
