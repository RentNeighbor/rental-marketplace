"use client";

import { useState, useMemo } from "react";

interface DateRange {
  start: string;
  end: string;
}

interface BlockedRange extends DateRange {
  id: string;
  reason: string | null;
}

interface AvailabilityCalendarProps {
  blockedRanges: BlockedRange[];
  bookedRanges: DateRange[];
  isOwner: boolean;
  onSelectRange?: (start: string, end: string) => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function dateToString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function inRange(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end;
}

type DayStatus = "past" | "blocked" | "booked" | "available" | "selected";

export default function AvailabilityCalendar({
  blockedRanges,
  bookedRanges,
  isOwner,
  onSelectRange,
}: AvailabilityCalendarProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [selStart, setSelStart] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState<string | null>(null);

  const todayStr = dateToString(now);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const days = useMemo(() => {
    const result: { date: number; dateStr: string; status: DayStatus }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      let status: DayStatus = "available";

      if (dateStr < todayStr) {
        status = "past";
      } else if (bookedRanges.some((r) => inRange(dateStr, r.start, r.end))) {
        status = "booked";
      } else if (blockedRanges.some((r) => inRange(dateStr, r.start, r.end))) {
        status = "blocked";
      }

      // Check if in owner's current selection
      if (
        status === "available" &&
        selStart &&
        selEnd &&
        inRange(dateStr, selStart < selEnd ? selStart : selEnd, selStart < selEnd ? selEnd : selStart)
      ) {
        status = "selected";
      } else if (status === "available" && selStart && !selEnd && dateStr === selStart) {
        status = "selected";
      }

      result.push({ date: d, dateStr, status });
    }
    return result;
  }, [month, year, daysInMonth, todayStr, blockedRanges, bookedRanges, selStart, selEnd]);

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  function handleDayClick(dateStr: string, status: DayStatus) {
    if (!onSelectRange) return;
    if (status === "past" || status === "booked") return;
    if (!isOwner && status === "blocked") return;

    if (!selStart || selEnd) {
      // Start new selection
      setSelStart(dateStr);
      setSelEnd(null);
    } else {
      // Complete selection
      const start = dateStr < selStart ? dateStr : selStart;
      const end = dateStr < selStart ? selStart : dateStr;
      setSelEnd(end);
      setSelStart(start);
      onSelectRange(start, end);
    }
  }

  function clearSelection() {
    setSelStart(null);
    setSelEnd(null);
  }

  const statusClasses: Record<DayStatus, string> = {
    past: "bg-gray-100 text-gray-300 cursor-not-allowed",
    blocked: "bg-gray-200 text-gray-400",
    booked: "bg-red-100 text-red-600",
    available: onSelectRange
      ? "bg-white hover:bg-green-50 cursor-pointer text-gray-900"
      : "bg-white text-gray-900",
    selected: "bg-blue-200 text-blue-900 ring-2 ring-blue-400",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-sm font-semibold text-gray-900">
          {MONTHS[month]} {year}
        </h3>
        <button
          onClick={nextMonth}
          className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before 1st */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {days.map(({ date, dateStr, status }) => (
          <button
            key={dateStr}
            type="button"
            disabled={status === "past" || status === "booked" || (!isOwner && status === "blocked")}
            onClick={() => handleDayClick(dateStr, status)}
            className={`aspect-square flex items-center justify-center rounded-md text-xs font-medium transition-colors ${statusClasses[status]}`}
            title={
              status === "blocked"
                ? "Blocked by owner"
                : status === "booked"
                  ? "Booked"
                  : status === "past"
                    ? "Past date"
                    : "Available"
            }
          >
            {date}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-white border border-gray-200" />
          Available
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-200" />
          Blocked
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-100 border border-red-200" />
          Booked
        </span>
        {onSelectRange && selStart && (
          <button
            onClick={clearSelection}
            className="text-blue-600 hover:underline ml-auto"
          >
            Clear selection
          </button>
        )}
      </div>
    </div>
  );
}
