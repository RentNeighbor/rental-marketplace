import { db } from "@/lib/db";
import { listings, categories, rentals, users, bids, rentalExtensions } from "@/lib/db/schema";
import { eq, desc, and, or, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ListingCard from "@/components/ListingCard";
import RentalActions from "@/components/RentalActions";
import BidList from "@/components/BidList";
import { approveRental, declineRental, cancelRental, completeRental, acceptBid, declineBid, withdrawBid, requestRentalExtension, approveRentalExtension, declineRentalExtension } from "@/lib/actions";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const allCategories = await db.select().from(categories);
  const categoryMap = Object.fromEntries(allCategories.map((c) => [c.id, c.name]));

  const myListings = await db
    .select()
    .from(listings)
    .where(eq(listings.userId, userId))
    .orderBy(desc(listings.createdAt));

  // Incoming rental requests (as owner)
  const incomingRentals = await db
    .select({
      id: rentals.id,
      startDate: rentals.startDate,
      endDate: rentals.endDate,
      totalPrice: rentals.totalPrice,
      status: rentals.status,
      renterId: rentals.renterId,
      ownerNotes: rentals.ownerNotes,
      listingId: rentals.listingId,
    })
    .from(rentals)
    .where(eq(rentals.ownerId, userId))
    .orderBy(desc(rentals.createdAt));

  // Get listing titles and renter names
  const rentalListingIds = [...new Set(incomingRentals.map((r) => r.listingId))];
  const rentalListings = await Promise.all(
    rentalListingIds.map((lid) =>
      db.query.listings.findFirst({ where: eq(listings.id, lid) })
    )
  );
  const listingTitleMap = Object.fromEntries(
    rentalListings.filter(Boolean).map((l) => [l!.id, l!.title])
  );

  const renterIds = [...new Set(incomingRentals.map((r) => r.renterId))];
  const renters = await Promise.all(
    renterIds.map((uid) =>
      db.query.users.findFirst({ where: eq(users.id, uid) })
    )
  );
  const renterMap = Object.fromEntries(
    renters.filter(Boolean).map((u) => [u!.id, u!.name])
  );

  // Fetch extensions for incoming rentals
  const incomingRentalIds = incomingRentals.map((r) => r.id);
  const incomingExtensions = incomingRentalIds.length > 0
    ? await db.select().from(rentalExtensions).where(inArray(rentalExtensions.rentalId, incomingRentalIds)).orderBy(desc(rentalExtensions.createdAt))
    : [];
  const extByRental: Record<string, typeof incomingExtensions> = {};
  for (const ext of incomingExtensions) {
    if (!extByRental[ext.rentalId]) extByRental[ext.rentalId] = [];
    extByRental[ext.rentalId].push(ext);
  }

  const formattedIncoming = incomingRentals.map((r) => ({
    id: r.id,
    startDate: r.startDate.toLocaleDateString(),
    endDate: r.endDate.toLocaleDateString(),
    endDateRaw: r.endDate.toISOString().split("T")[0],
    totalPrice: r.totalPrice,
    status: r.status,
    renterId: r.renterId,
    renterName: renterMap[r.renterId] || "Unknown",
    ownerNotes: r.ownerNotes,
    listingTitle: listingTitleMap[r.listingId] || "Unknown listing",
    extensions: (extByRental[r.id] || []).map((e) => ({
      id: e.id,
      newEndDate: e.newEndDate.toLocaleDateString(),
      newEndDateRaw: e.newEndDate.toISOString().split("T")[0],
      message: e.message,
      status: e.status,
      additionalPrice: e.additionalPrice,
    })),
  }));

  const pendingCount = formattedIncoming.filter((r) => r.status === "pending").length;
  const activeCount = formattedIncoming.filter((r) => r.status === "active").length;

  // Incoming bids (as owner)
  const incomingBids = await db
    .select({
      id: bids.id,
      amount: bids.amount,
      startDate: bids.startDate,
      endDate: bids.endDate,
      message: bids.message,
      status: bids.status,
      bidderId: bids.bidderId,
      listingId: bids.listingId,
      createdAt: bids.createdAt,
    })
    .from(bids)
    .where(eq(bids.ownerId, userId))
    .orderBy(desc(bids.createdAt));

  const bidderIds = [...new Set(incomingBids.map((b) => b.bidderId))];
  const bidders = await Promise.all(
    bidderIds.map((uid) =>
      db.query.users.findFirst({ where: eq(users.id, uid) })
    )
  );
  const bidderMap = Object.fromEntries(
    bidders.filter(Boolean).map((u) => [u!.id, u!.name])
  );

  // Group bids by listing
  const bidsByListing = new Map<string, typeof formattedBidsAll>();
  const formattedBidsAll = incomingBids.map((b) => ({
    id: b.id,
    amount: b.amount,
    startDate: b.startDate.toLocaleDateString(),
    endDate: b.endDate.toLocaleDateString(),
    message: b.message,
    status: b.status,
    bidderId: b.bidderId,
    bidderName: bidderMap[b.bidderId] || "Unknown",
    createdAt: b.createdAt.toLocaleDateString(),
    listingId: b.listingId,
  }));

  for (const bid of formattedBidsAll) {
    const group = bidsByListing.get(bid.listingId) || [];
    group.push(bid);
    bidsByListing.set(bid.listingId, group);
  }

  const pendingBidCount = formattedBidsAll.filter((b) => b.status === "pending").length;

  // ---------- Outgoing rentals (as renter) ----------
  const outgoingRentals = await db
    .select({
      id: rentals.id,
      startDate: rentals.startDate,
      endDate: rentals.endDate,
      totalPrice: rentals.totalPrice,
      status: rentals.status,
      renterId: rentals.renterId,
      ownerId: rentals.ownerId,
      ownerNotes: rentals.ownerNotes,
      listingId: rentals.listingId,
    })
    .from(rentals)
    .where(eq(rentals.renterId, userId))
    .orderBy(desc(rentals.createdAt));

  // Fetch listing titles for outgoing rentals (reuse map if already fetched)
  const outgoingListingIds = [
    ...new Set(outgoingRentals.map((r) => r.listingId)),
  ].filter((lid) => !listingTitleMap[lid]);
  const outgoingListings = await Promise.all(
    outgoingListingIds.map((lid) =>
      db.query.listings.findFirst({ where: eq(listings.id, lid) })
    )
  );
  for (const l of outgoingListings) {
    if (l) listingTitleMap[l.id] = l.title;
  }

  // Fetch owner names
  const ownerIds = [...new Set(outgoingRentals.map((r) => r.ownerId))];
  const owners = await Promise.all(
    ownerIds.map((uid) =>
      db.query.users.findFirst({ where: eq(users.id, uid) })
    )
  );
  const ownerMap = Object.fromEntries(
    owners.filter(Boolean).map((u) => [u!.id, u!.name])
  );

  // Fetch extensions for outgoing rentals
  const outgoingRentalIds = outgoingRentals.map((r) => r.id);
  const outgoingExtensions =
    outgoingRentalIds.length > 0
      ? await db
          .select()
          .from(rentalExtensions)
          .where(inArray(rentalExtensions.rentalId, outgoingRentalIds))
          .orderBy(desc(rentalExtensions.createdAt))
      : [];
  const outExtByRental: Record<string, typeof outgoingExtensions> = {};
  for (const ext of outgoingExtensions) {
    if (!outExtByRental[ext.rentalId]) outExtByRental[ext.rentalId] = [];
    outExtByRental[ext.rentalId].push(ext);
  }

  const formattedOutgoing = outgoingRentals.map((r) => ({
    id: r.id,
    startDate: r.startDate.toLocaleDateString(),
    endDate: r.endDate.toLocaleDateString(),
    endDateRaw: r.endDate.toISOString().split("T")[0],
    totalPrice: r.totalPrice,
    status: r.status,
    renterId: r.renterId,
    renterName: "You",
    ownerNotes: r.ownerNotes,
    listingTitle: listingTitleMap[r.listingId] || "Unknown listing",
    listingId: r.listingId,
    ownerName: ownerMap[r.ownerId] || "Unknown",
    extensions: (outExtByRental[r.id] || []).map((e) => ({
      id: e.id,
      newEndDate: e.newEndDate.toLocaleDateString(),
      newEndDateRaw: e.newEndDate.toISOString().split("T")[0],
      message: e.message,
      status: e.status,
      additionalPrice: e.additionalPrice,
    })),
  }));

  const outgoingActive = formattedOutgoing.filter(
    (r) => r.status === "active"
  );
  const outgoingPending = formattedOutgoing.filter(
    (r) => r.status === "pending"
  );
  const outgoingPast = formattedOutgoing.filter(
    (r) =>
      r.status === "completed" ||
      r.status === "declined" ||
      r.status === "cancelled"
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/stats"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            View Stats
          </Link>
          <Link
            href="/post"
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Post New
          </Link>
        </div>
      </div>

      {/* Rental requests summary */}
      {formattedIncoming.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Rental Requests
            {pendingCount > 0 && (
              <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                {pendingCount} pending
              </span>
            )}
            {activeCount > 0 && (
              <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                {activeCount} active
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500 mb-3">Requests from people who want to rent your items</p>
          <div className="space-y-3">
            {formattedIncoming.map((rental) => (
              <div key={rental.id}>
                <p className="text-xs text-gray-400 mb-1">{rental.listingTitle}</p>
                <RentalActions
                  rental={rental}
                  isOwner={true}
                  approveAction={approveRental}
                  declineAction={declineRental}
                  cancelAction={cancelRental}
                  completeAction={completeRental}
                  requestExtensionAction={requestRentalExtension}
                  approveExtensionAction={approveRentalExtension}
                  declineExtensionAction={declineRentalExtension}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incoming bids */}
      {pendingBidCount > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Offers
            <span className="ml-2 text-sm bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
              {pendingBidCount} pending
            </span>
          </h2>
          <p className="text-sm text-gray-500 mb-3">Price offers from potential renters</p>
          {Array.from(bidsByListing.entries()).map(([lid, bidGroup]) => {
            const pendingInGroup = bidGroup.filter((b) => b.status === "pending");
            if (pendingInGroup.length === 0) return null;
            return (
              <div key={lid} className="mb-4">
                <p className="text-xs text-gray-400 mb-2">
                  {listingTitleMap[lid] || "Unknown listing"}
                </p>
                <BidList
                  bids={pendingInGroup}
                  isOwner={true}
                  currentUserId={userId}
                  acceptAction={acceptBid}
                  declineAction={declineBid}
                  withdrawAction={withdrawBid}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Your rentals (as renter) */}
      {formattedOutgoing.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Your Rentals
            {outgoingActive.length > 0 && (
              <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                {outgoingActive.length} active
              </span>
            )}
            {outgoingPending.length > 0 && (
              <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                {outgoingPending.length} pending
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            Items you&apos;re renting from others
          </p>

          {/* Active rentals first */}
          {outgoingActive.length > 0 && (
            <div className="space-y-3 mb-4">
              {outgoingActive.map((rental) => (
                <div key={rental.id}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <Link
                      href={`/listing/${rental.listingId}`}
                      className="text-xs text-green-700 hover:underline font-medium"
                    >
                      {rental.listingTitle}
                    </Link>
                    <span className="text-xs text-gray-400">
                      from {rental.ownerName}
                    </span>
                  </div>
                  <RentalActions
                    rental={rental}
                    isOwner={false}
                    approveAction={approveRental}
                    declineAction={declineRental}
                    cancelAction={cancelRental}
                    completeAction={completeRental}
                    requestExtensionAction={requestRentalExtension}
                    approveExtensionAction={approveRentalExtension}
                    declineExtensionAction={declineRentalExtension}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Pending rentals */}
          {outgoingPending.length > 0 && (
            <div className="space-y-3 mb-4">
              {outgoingPending.map((rental) => (
                <div key={rental.id}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <Link
                      href={`/listing/${rental.listingId}`}
                      className="text-xs text-green-700 hover:underline font-medium"
                    >
                      {rental.listingTitle}
                    </Link>
                    <span className="text-xs text-gray-400">
                      from {rental.ownerName}
                    </span>
                  </div>
                  <RentalActions
                    rental={rental}
                    isOwner={false}
                    approveAction={approveRental}
                    declineAction={declineRental}
                    cancelAction={cancelRental}
                    completeAction={completeRental}
                    requestExtensionAction={requestRentalExtension}
                    approveExtensionAction={approveRentalExtension}
                    declineExtensionAction={declineRentalExtension}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Past rentals (collapsed) */}
          {outgoingPast.length > 0 && (
            <details className="group">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 mb-2">
                {outgoingPast.length} past rental{outgoingPast.length !== 1 ? "s" : ""}
              </summary>
              <div className="space-y-3">
                {outgoingPast.map((rental) => (
                  <div key={rental.id}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <Link
                        href={`/listing/${rental.listingId}`}
                        className="text-xs text-green-700 hover:underline font-medium"
                      >
                        {rental.listingTitle}
                      </Link>
                      <span className="text-xs text-gray-400">
                        from {rental.ownerName}
                      </span>
                      {rental.status === "completed" && (
                        <Link
                          href={`/listing/${rental.listingId}`}
                          className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full hover:bg-green-100 font-medium"
                        >
                          Rent Again
                        </Link>
                      )}
                    </div>
                    <RentalActions
                      rental={rental}
                      isOwner={false}
                      approveAction={approveRental}
                      declineAction={declineRental}
                      cancelAction={cancelRental}
                      completeAction={completeRental}
                      requestExtensionAction={requestRentalExtension}
                      approveExtensionAction={approveRentalExtension}
                      declineExtensionAction={declineRentalExtension}
                    />
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* My Listings heading */}
      <div className="flex items-center justify-between mb-4 border-t border-gray-200 pt-6">
        <h2 className="text-lg font-semibold text-gray-900">My Listings</h2>
      </div>

      {myListings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">You haven&apos;t posted anything yet</p>
          <Link href="/post" className="text-green-700 hover:underline text-sm mt-2 inline-block">
            Post your first item
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {myListings.map((listing) => (
            <ListingCard
              key={listing.id}
              id={listing.id}
              title={listing.title}
              pricePerDay={listing.pricePerDay}
              pricePerWeek={listing.pricePerWeek}
              location={listing.location}
              imageUrls={listing.imageUrls}
              status={listing.status}
              categoryName={
                listing.categoryId
                  ? categoryMap[listing.categoryId]
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
