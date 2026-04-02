import { safeParseImageUrls } from "@/lib/utils";
import { db } from "@/lib/db";
import { rentals, listings, users } from "@/lib/db/schema";
import { eq, desc, and, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function RentalHistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const userRentals = await db
    .select({
      id: rentals.id,
      listingId: rentals.listingId,
      startDate: rentals.startDate,
      endDate: rentals.endDate,
      totalPrice: rentals.totalPrice,
      status: rentals.status,
      ownerId: rentals.ownerId,
    })
    .from(rentals)
    .where(eq(rentals.renterId, userId))
    .orderBy(desc(rentals.createdAt));

  // Get listing details
  const listingIds = [...new Set(userRentals.map((r) => r.listingId))];
  const listingDetails = await Promise.all(
    listingIds.map((lid) =>
      db.query.listings.findFirst({ where: eq(listings.id, lid) })
    )
  );
  const listingMap = Object.fromEntries(
    listingDetails.filter(Boolean).map((l) => [l!.id, l!])
  );

  // Get owner names
  const ownerIds = [...new Set(userRentals.map((r) => r.ownerId))];
  const ownerDetails = await Promise.all(
    ownerIds.map((uid) =>
      db.query.users.findFirst({ where: eq(users.id, uid) })
    )
  );
  const ownerMap = Object.fromEntries(
    ownerDetails.filter(Boolean).map((u) => [u!.id, u!.name])
  );

  const completedRentals = userRentals.filter((r) => r.status === "completed");
  const activeRentals = userRentals.filter((r) => r.status === "active" || r.status === "pending");
  const otherRentals = userRentals.filter((r) => r.status === "declined" || r.status === "cancelled");

  function statusBadge(status: string) {
    const styles: Record<string, string> = {
      completed: "bg-green-50 text-green-700",
      active: "bg-blue-50 text-blue-700",
      pending: "bg-yellow-50 text-yellow-700",
      declined: "bg-red-50 text-red-600",
      cancelled: "bg-gray-100 text-gray-500",
    };
    return styles[status] || "bg-gray-100 text-gray-500";
  }

  function RentalRow({ rental }: { rental: typeof userRentals[0] }) {
    const listing = listingMap[rental.listingId];
    const images = safeParseImageUrls(listing?.imageUrls);
    const ownerName = ownerMap[rental.ownerId] || "Unknown";
    const days = Math.ceil(
      (rental.endDate.getTime() - rental.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
      <div className="flex gap-4 p-4 bg-white rounded-lg border border-gray-200">
        <div className="shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
          {images.length > 0 ? (
            <img src={images[0]} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
              No photo
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link
                href={`/listing/${rental.listingId}`}
                className="font-medium text-sm text-gray-900 hover:text-green-700"
              >
                {listing?.title || "Unknown listing"}
              </Link>
              <p className="text-xs text-gray-400 mt-0.5">from {ownerName}</p>
            </div>
            <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadge(rental.status)}`}>
              {rental.status}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>{rental.startDate.toLocaleDateString()} – {rental.endDate.toLocaleDateString()}</span>
            <span>{days} day{days !== 1 ? "s" : ""}</span>
            {rental.totalPrice && <span className="font-medium text-gray-700">${rental.totalPrice}</span>}
          </div>
          {rental.status === "completed" && listing?.status === "active" && (
            <Link
              href={`/listing/${rental.listingId}`}
              className="inline-block mt-2 text-xs bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 font-medium"
            >
              Rent Again
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Rental History</h1>
        <Link href="/dashboard" className="text-sm text-green-700 hover:underline">
          Back to Dashboard
        </Link>
      </div>

      {userRentals.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No rentals yet</p>
          <Link href="/" className="text-green-700 hover:underline text-sm mt-2 inline-block">
            Browse listings
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {activeRentals.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Active & Pending ({activeRentals.length})
              </h2>
              <div className="space-y-3">
                {activeRentals.map((r) => <RentalRow key={r.id} rental={r} />)}
              </div>
            </div>
          )}

          {completedRentals.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Completed ({completedRentals.length})
              </h2>
              <div className="space-y-3">
                {completedRentals.map((r) => <RentalRow key={r.id} rental={r} />)}
              </div>
            </div>
          )}

          {otherRentals.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Cancelled & Declined ({otherRentals.length})
              </h2>
              <div className="space-y-3">
                {otherRentals.map((r) => <RentalRow key={r.id} rental={r} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
