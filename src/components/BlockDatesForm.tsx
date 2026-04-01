"use client";

import { useActionState, useState } from "react";

interface BlockedRange {
  id: string;
  start: string;
  end: string;
  reason: string | null;
}

interface BlockDatesFormProps {
  listingId: string;
  blockedRanges: BlockedRange[];
  selectedStart: string;
  selectedEnd: string;
  blockAction: (formData: FormData) => Promise<void>;
  unblockAction: (formData: FormData) => Promise<void>;
}

export default function BlockDatesForm({
  listingId,
  blockedRanges,
  selectedStart,
  selectedEnd,
  blockAction,
  unblockAction,
}: BlockDatesFormProps) {
  const [startDate, setStartDate] = useState(selectedStart);
  const [endDate, setEndDate] = useState(selectedEnd);

  // Sync with calendar selection
  if (selectedStart !== startDate && selectedStart) setStartDate(selectedStart);
  if (selectedEnd !== endDate && selectedEnd) setEndDate(selectedEnd);

  const today = new Date().toISOString().split("T")[0];

  async function handleBlock(_prev: string | null, formData: FormData) {
    try {
      await blockAction(formData);
      setStartDate("");
      setEndDate("");
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }

  async function handleUnblock(_prev: string | null, formData: FormData) {
    try {
      await unblockAction(formData);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }

  const [blockError, blockFormAction, blockPending] = useActionState(handleBlock, null);
  const [unblockError, unblockFormAction, unblockPending] = useActionState(handleUnblock, null);

  function formatDate(dateStr: string) {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-4">
      {/* Block form */}
      <form action={blockFormAction} className="space-y-3">
        <input type="hidden" name="listingId" value={listingId} />

        {blockError && (
          <div className="bg-red-50 text-red-700 p-2.5 rounded text-xs">
            {blockError}
          </div>
        )}

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

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Reason (optional)
          </label>
          <input
            type="text"
            name="reason"
            placeholder="e.g., vacation, maintenance"
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={blockPending || !startDate || !endDate}
          className="w-full rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {blockPending ? "Blocking..." : "Block These Dates"}
        </button>
      </form>

      {/* Existing blocked ranges */}
      {blockedRanges.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 mb-2">
            Blocked Date Ranges
          </h4>

          {unblockError && (
            <div className="bg-red-50 text-red-700 p-2.5 rounded text-xs mb-2">
              {unblockError}
            </div>
          )}

          <div className="space-y-2">
            {blockedRanges.map((range) => (
              <div
                key={range.id}
                className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
              >
                <div>
                  <p className="text-sm text-gray-700">
                    {formatDate(range.start)} &mdash; {formatDate(range.end)}
                  </p>
                  {range.reason && (
                    <p className="text-xs text-gray-400">{range.reason}</p>
                  )}
                </div>
                <form action={unblockFormAction}>
                  <input type="hidden" name="blockedDateId" value={range.id} />
                  <button
                    type="submit"
                    disabled={unblockPending}
                    className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                  >
                    Unblock
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
