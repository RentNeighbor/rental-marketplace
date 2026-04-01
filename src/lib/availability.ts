import { db } from "@/lib/db";
import { blockedDates, rentals } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";

export interface DateRange {
  start: string; // ISO date string YYYY-MM-DD
  end: string;
}

export interface BlockedRange extends DateRange {
  id: string;
  reason: string | null;
}

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function getUnavailableDateRanges(listingId: string) {
  const blocked = await db
    .select({
      id: blockedDates.id,
      startDate: blockedDates.startDate,
      endDate: blockedDates.endDate,
      reason: blockedDates.reason,
    })
    .from(blockedDates)
    .where(eq(blockedDates.listingId, listingId));

  const booked = await db
    .select({
      startDate: rentals.startDate,
      endDate: rentals.endDate,
    })
    .from(rentals)
    .where(
      and(
        eq(rentals.listingId, listingId),
        or(eq(rentals.status, "pending"), eq(rentals.status, "active"))
      )
    );

  const blockedRanges: BlockedRange[] = blocked.map((b) => ({
    id: b.id,
    start: toDateString(b.startDate),
    end: toDateString(b.endDate),
    reason: b.reason,
  }));

  const bookedRanges: DateRange[] = booked.map((r) => ({
    start: toDateString(r.startDate),
    end: toDateString(r.endDate),
  }));

  // Combined unavailable ranges for form validation
  const allUnavailable: DateRange[] = [
    ...blockedRanges.map(({ start, end }) => ({ start, end })),
    ...bookedRanges,
  ];

  return { blockedRanges, bookedRanges, allUnavailable };
}
