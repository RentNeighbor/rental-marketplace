import { db } from "@/lib/db";
import { listings, users, categories, rentalPhotos, disputes, reviews, rentals, bids, rentalExtensions, listingViews } from "@/lib/db/schema";
import { eq, desc, and, or, inArray, sql, count, gte } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { deleteListing, submitRentalPhoto, reportListing, submitDispute, submitReview, startConversation, requestRental, initiateRentalCheckout, approveRental, declineRental, cancelRental, completeRental, placeBid, acceptBid, declineBid, withdrawBid, blockDates, unblockDates, requestRentalExtension, approveRentalExtension, declineRentalExtension } from "@/lib/actions";
import { getUnavailableDateRanges } from "@/lib/availability";
import RentalPhotos from "@/components/RentalPhotos";
import ReportButton from "@/components/ReportButton";
import DisputeButton from "@/components/DisputeButton";
import ReviewForm from "@/components/ReviewForm";
import MessageOwnerButton from "@/components/MessageOwnerButton";
import RentalRequestForm from "@/components/RentalRequestForm";
import RentalActions from "@/components/RentalActions";
import BidForm from "@/components/BidForm";
import BidList from "@/components/BidList";
import AvailabilitySection from "@/components/AvailabilitySection";
import RenterBookingWrapper from "@/components/RenterBookingWrapper";
import DeleteListingButton from "@/components/DeleteListingButton";
import ListingMapWrapper from "@/components/ListingMapWrapper";

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, id),
  });

  if (!listing) notFound();

  // Record view and count views in past 7 days
  await db.insert(listingViews).values({ listingId: id });
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [viewCountResult] = await db
    .select({ value: count() })
    .from(listingViews)
    .where(
      and(
        eq(listingViews.listingId, id),
        gte(listingViews.viewedAt, sevenDaysAgo)
      )
    );
  const recentViewCount = viewCountResult?.value ?? 0;

  // Count completed/active rentals for this listing
  const [rentalCountResult] = await db
    .select({ value: count() })
    .from(rentals)
    .where(
      and(
        eq(rentals.listingId, id),
        or(eq(rentals.status, "completed"), eq(rentals.status, "active"))
      )
    );
  const rentalCount = rentalCountResult?.value ?? 0;

  const { blockedRanges, bookedRanges, allUnavailable } = await getUnavailableDateRanges(id);

  const user = await db.query.users.findFirst({
    where: eq(users.id, listing.userId),
  });

  const category = listing.categoryId
    ? await db.query.categories.findFirst({
        where: eq(categories.id, listing.categoryId),
      })
    : null;

  // Fetch rental photos with uploader names
  const photos = await db
    .select({
      id: rentalPhotos.id,
      type: rentalPhotos.type,
      photoUrl: rentalPhotos.photoUrl,
      notes: rentalPhotos.notes,
      createdAt: rentalPhotos.createdAt,
      uploadedBy: rentalPhotos.uploadedBy,
    })
    .from(rentalPhotos)
    .where(eq(rentalPhotos.listingId, id))
    .orderBy(desc(rentalPhotos.createdAt));

  // Get uploader names
  const uploaderIds = [...new Set(photos.map((p) => p.uploadedBy))];
  const uploaders = await Promise.all(
    uploaderIds.map((uid) =>
      db.query.users.findFirst({ where: eq(users.id, uid) })
    )
  );
  const uploaderMap = Object.fromEntries(
    uploaders.filter(Boolean).map((u) => [u!.id, u!.name])
  );

  const formattedPhotos = photos.map((p) => ({
    id: p.id,
    type: p.type as "check_in" | "check_out",
    photoUrl: p.photoUrl,
    notes: p.notes,
    uploaderName: uploaderMap[p.uploadedBy] || "Unknown",
    createdAt: p.createdAt.toLocaleDateString(),
  }));

  // Check for open dispute by current user
  let hasOpenDispute = false;
  if (session?.user?.id && session.user.id !== listing.userId) {
    const existingDispute = await db.query.disputes.findFirst({
      where: and(
        eq(disputes.listingId, id),
        eq(disputes.filedBy, session.user.id),
        eq(disputes.status, "open")
      ),
    });
    hasOpenDispute = !!existingDispute;
  }

  // Check if current user already reviewed this listing
  let hasReviewed = false;
  if (session?.user?.id) {
    const existingReview = await db.query.reviews.findFirst({
      where: and(
        eq(reviews.listingId, id),
        eq(reviews.reviewerId, session.user.id)
      ),
    });
    hasReviewed = !!existingReview;
  }

  // Fetch reviews for this listing
  const listingReviews = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      role: reviews.role,
      reviewerId: reviews.reviewerId,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .where(eq(reviews.listingId, id))
    .orderBy(desc(reviews.createdAt));

  const reviewUserIds = [...new Set(listingReviews.map((r) => r.reviewerId))];
  const reviewUsers = await Promise.all(
    reviewUserIds.map((uid) =>
      db.query.users.findFirst({ where: eq(users.id, uid) })
    )
  );
  const reviewUserMap = Object.fromEntries(
    reviewUsers.filter(Boolean).map((u) => [u!.id, u!.name])
  );

  // Owner's overall rating
  const ownerReviews = await db
    .select({ rating: reviews.rating })
    .from(reviews)
    .where(eq(reviews.revieweeId, listing.userId));
  const ownerAvgRating =
    ownerReviews.length > 0
      ? ownerReviews.reduce((sum, r) => sum + r.rating, 0) / ownerReviews.length
      : null;
  const ownerReviewCount = ownerReviews.length;

  // Fetch rentals for this listing
  const listingRentals = session?.user?.id
    ? await db
        .select({
          id: rentals.id,
          startDate: rentals.startDate,
          endDate: rentals.endDate,
          totalPrice: rentals.totalPrice,
          status: rentals.status,
          renterId: rentals.renterId,
          ownerNotes: rentals.ownerNotes,
        })
        .from(rentals)
        .where(
          and(
            eq(rentals.listingId, id),
            or(
              eq(rentals.renterId, session.user.id),
              eq(rentals.ownerId, session.user.id)
            )
          )
        )
        .orderBy(desc(rentals.createdAt))
    : [];

  // Get renter names for rentals
  const renterIds = [...new Set(listingRentals.map((r) => r.renterId))];
  const renters = await Promise.all(
    renterIds.map((uid) =>
      db.query.users.findFirst({ where: eq(users.id, uid) })
    )
  );
  const renterMap = Object.fromEntries(
    renters.filter(Boolean).map((u) => [u!.id, u!.name])
  );

  // Fetch extensions for all rentals
  const rentalIds = listingRentals.map((r) => r.id);
  const extensionRows = rentalIds.length > 0
    ? await db.select().from(rentalExtensions).where(inArray(rentalExtensions.rentalId, rentalIds)).orderBy(desc(rentalExtensions.createdAt))
    : [];
  const extensionsByRental: Record<string, typeof extensionRows> = {};
  for (const ext of extensionRows) {
    if (!extensionsByRental[ext.rentalId]) extensionsByRental[ext.rentalId] = [];
    extensionsByRental[ext.rentalId].push(ext);
  }

  const formattedRentals = listingRentals.map((r) => ({
    id: r.id,
    startDate: r.startDate.toLocaleDateString(),
    endDate: r.endDate.toLocaleDateString(),
    endDateRaw: r.endDate.toISOString().split("T")[0],
    totalPrice: r.totalPrice,
    status: r.status,
    renterId: r.renterId,
    renterName: renterMap[r.renterId] || "Unknown",
    ownerNotes: r.ownerNotes,
    listingTitle: listing.title,
    extensions: (extensionsByRental[r.id] || []).map((e) => ({
      id: e.id,
      newEndDate: e.newEndDate.toLocaleDateString(),
      newEndDateRaw: e.newEndDate.toISOString().split("T")[0],
      message: e.message,
      status: e.status,
      additionalPrice: e.additionalPrice,
    })),
  }));

  // Check if user has an active/pending rental already
  const hasActiveRental = listingRentals.some(
    (r) => r.status === "pending" || r.status === "active"
  );

  // Fetch bids for this listing (owner sees all, others see their own + accepted)
  const listingBids = session?.user?.id
    ? await db
        .select({
          id: bids.id,
          amount: bids.amount,
          startDate: bids.startDate,
          endDate: bids.endDate,
          message: bids.message,
          status: bids.status,
          bidderId: bids.bidderId,
          createdAt: bids.createdAt,
        })
        .from(bids)
        .where(
          session.user.id === listing.userId
            ? eq(bids.listingId, id) // Owner sees all bids
            : and(
                eq(bids.listingId, id),
                eq(bids.bidderId, session.user.id) // Others see only their own
              )
        )
        .orderBy(desc(bids.createdAt))
    : [];

  const bidderIds = [...new Set(listingBids.map((b) => b.bidderId))];
  const bidders = await Promise.all(
    bidderIds.map((uid) =>
      db.query.users.findFirst({ where: eq(users.id, uid) })
    )
  );
  const bidderMap = Object.fromEntries(
    bidders.filter(Boolean).map((u) => [u!.id, u!.name])
  );

  const formattedBids = listingBids.map((b) => ({
    id: b.id,
    amount: b.amount,
    startDate: b.startDate.toLocaleDateString(),
    endDate: b.endDate.toLocaleDateString(),
    message: b.message,
    status: b.status,
    bidderId: b.bidderId,
    bidderName: bidderMap[b.bidderId] || "Unknown",
    createdAt: b.createdAt.toLocaleDateString(),
  }));

  const hasPendingBid = listingBids.some(
    (b) => b.bidderId === session?.user?.id && b.status === "pending"
  );

  const images = listing.imageUrls ? JSON.parse(listing.imageUrls) : [];
  const isOwner = session?.user?.id === listing.userId;

  const currentUser = session?.user?.id
    ? await db.query.users.findFirst({ where: eq(users.id, session.user.id) })
    : null;
  const identityVerified = currentUser?.stripeIdentityVerified ?? false;

  const conditionLabel = (c: string) => ({
    new: "New",
    like_new: "Like New",
    excellent: "Excellent",
    good: "Good",
    fair: "Fair",
    well_worn: "Well Worn",
  }[c] ?? c);

  const price = listing.pricePerDay
    ? `$${listing.pricePerDay}/day`
    : listing.pricePerWeek
      ? `$${listing.pricePerWeek}/week`
      : "Contact for price";

  return (
    <div className="mx-auto max-w-4xl px-6 py-5">
      <Link
        href="/"
        className="text-sm text-green-700 hover:underline mb-3 inline-block"
      >
        &larr; Back to listings
      </Link>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center h-[260px]">
            {images.length > 0 ? (
              <img
                src={images[0]}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-400">No photo</span>
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {images.slice(1).map((url: string, i: number) => (
                <div key={i} className="bg-gray-100 rounded-lg overflow-hidden h-[80px]">
                  <img
                    src={url}
                    alt={`${listing.title} photo ${i + 2}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {listing.title}
            </h1>
            {listing.status !== "active" && (
              <span className="shrink-0 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                {listing.status === "rented" ? "Currently Rented" : "Paused"}
              </span>
            )}
          </div>

          <p className="text-xl font-semibold text-green-700 mt-1">{price}</p>

          {listing.pricePerDay && listing.pricePerWeek && (
            <p className="text-sm text-gray-500">
              or ${listing.pricePerWeek}/week
            </p>
          )}

          {listing.securityDeposit && (
            <p className="mt-1 text-sm text-amber-700">
              ${listing.securityDeposit} security deposit
            </p>
          )}

          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            {rentalCount > 0 && (
              <span>Rented {rentalCount} {rentalCount === 1 ? "time" : "times"}</span>
            )}
            <span>Viewed {recentViewCount} {recentViewCount === 1 ? "time" : "times"} in past 7 days</span>
          </div>

          <div className="mt-3 space-y-1 text-sm text-gray-600">
            <p>
              <span className="font-medium text-gray-700">Location:</span>{" "}
              {listing.location}
            </p>
            {category && (
              <p>
                <span className="font-medium text-gray-700">Category:</span>{" "}
                {category.name}
              </p>
            )}
            {listing.condition && (
              <p>
                <span className="font-medium text-gray-700">Condition:</span>{" "}
                {conditionLabel(listing.condition)}
              </p>
            )}
            <p className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-gray-700">Posted by:</span>{" "}
              <Link
                href={`/user/${listing.userId}`}
                className="text-green-700 hover:underline"
              >
                {user?.name}
              </Link>
              {ownerAvgRating !== null && (
                <span className="inline-flex items-center gap-0.5 text-xs text-gray-500">
                  <svg className="w-3 h-3 text-yellow-400 fill-yellow-400" viewBox="0 0 24 24">
                    <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                  </svg>
                  {ownerAvgRating.toFixed(1)} ({ownerReviewCount})
                </span>
              )}
            </p>
          </div>

          <div className="mt-4">
            <h2 className="font-medium text-gray-900 mb-1">Description</h2>
            <p className="text-gray-600 text-sm whitespace-pre-wrap">
              {listing.description}
            </p>
          </div>

          {listing.latitude && listing.longitude && (
            <div className="mt-4">
              <h2 className="font-medium text-gray-900 mb-1">General location</h2>
              <p className="text-xs text-gray-400 mb-1.5">
                Exact address is shared only after a rental is confirmed.
              </p>
              <ListingMapWrapper
                lat={listing.latitude}
                lng={listing.longitude}
                listingId={id}
              />
            </div>
          )}

          {listing.securityDeposit && (
            <div className="mt-3 bg-gray-50 rounded-lg p-2.5 text-xs text-gray-500">
              <strong className="text-gray-700">About the deposit:</strong>{" "}
              The ${listing.securityDeposit} deposit is arranged directly
              between renter and lister. Condition photos are required before
              and after the rental. If there&apos;s a dispute, these photos
              serve as evidence.
            </div>
          )}

          {isOwner ? (
            <AvailabilitySection
              listingId={id}
              blockedRanges={blockedRanges}
              bookedRanges={bookedRanges}
              isOwner={true}
              blockAction={blockDates}
              unblockAction={unblockDates}
            />
          ) : (
            listing.status === "active" && session?.user && !hasActiveRental && (
              <RenterBookingWrapper
                listingId={id}
                blockedRanges={blockedRanges}
                bookedRanges={bookedRanges}
                unavailableRanges={allUnavailable}
                pricePerDay={listing.pricePerDay}
                pricePerWeek={listing.pricePerWeek}
                securityDeposit={listing.securityDeposit}
                identityVerified={identityVerified}
                submitAction={initiateRentalCheckout}
              />
            )
          )}

          <div className="mt-4 space-y-2">
            {listing.status === "active" && !isOwner && session?.user && (
              <MessageOwnerButton
                listingId={id}
                ownerName={user?.name || "the owner"}
                submitAction={startConversation}
              />
            )}
            {listing.status === "active" && !isOwner && session?.user && !hasPendingBid && !hasActiveRental && (
              <BidForm
                listingId={id}
                pricePerDay={listing.pricePerDay}
                pricePerWeek={listing.pricePerWeek}
                unavailableRanges={allUnavailable}
                submitAction={placeBid}
              />
            )}
            {listing.status === "active" && !session?.user && (
              <Link
                href="/login"
                className="block text-center rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700 transition-colors"
              >
                Log in to rent or message owner
              </Link>
            )}

            {isOwner && (
              <div className="flex gap-2 pt-3 border-t border-gray-200">
                <Link
                  href={`/listing/${id}/edit`}
                  className="flex-1 text-center rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Edit
                </Link>
                <DeleteListingButton id={id} action={deleteListing} />
              </div>
            )}

            {session?.user && !isOwner && (
              <ReportButton
                listingId={id}
                submitAction={reportListing}
              />
            )}
          </div>
        </div>
      </div>

      {/* Rental condition photos */}
      <RentalPhotos
        listingId={id}
        photos={formattedPhotos}
        isLoggedIn={!!session?.user}
        hasDeposit={!!listing.securityDeposit}
        listingStatus={listing.status}
        submitAction={submitRentalPhoto}
      />

      {/* Deposit dispute */}
      {session?.user && !isOwner && listing.securityDeposit && (
        <DisputeButton
          listingId={id}
          hasOpenDispute={hasOpenDispute}
          submitAction={submitDispute}
        />
      )}

      {/* Reviews section */}
      <div className="mt-6 border-t border-gray-200 pt-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Reviews</h2>

        {/* Review form — non-owners who haven't reviewed yet */}
        {session?.user && !isOwner && !hasReviewed && (
          <div className="mb-4">
            <ReviewForm
              listingId={id}
              revieweeId={listing.userId}
              revieweeName={user?.name || "the owner"}
              role="renter"
              submitAction={submitReview}
            />
          </div>
        )}

        {listingReviews.length === 0 ? (
          <p className="text-sm text-gray-400">No reviews yet for this listing.</p>
        ) : (
          <div className="space-y-2">
            {listingReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white border border-gray-200 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= review.rating
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-200"
                          }`}
                          viewBox="0 0 24 24"
                        >
                          <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">
                      by{" "}
                      <Link
                        href={`/user/${review.reviewerId}`}
                        className="text-green-700 hover:underline"
                      >
                        {reviewUserMap[review.reviewerId] || "Unknown"}
                      </Link>
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {review.createdAt.toLocaleDateString()}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-sm text-gray-600">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rental requests / status */}
      {formattedRentals.length > 0 && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            {isOwner ? "Rental Requests" : "Your Rentals"}
          </h2>
          <div className="space-y-2">
            {formattedRentals.map((rental) => (
              <RentalActions
                key={rental.id}
                rental={rental}
                isOwner={isOwner}
                approveAction={approveRental}
                declineAction={declineRental}
                cancelAction={cancelRental}
                completeAction={completeRental}
                requestExtensionAction={requestRentalExtension}
                approveExtensionAction={approveRentalExtension}
                declineExtensionAction={declineRentalExtension}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bids / Offers */}
      {formattedBids.length > 0 && (
        <BidList
          bids={formattedBids}
          isOwner={isOwner}
          currentUserId={session?.user?.id || null}
          acceptAction={acceptBid}
          declineAction={declineBid}
          withdrawAction={withdrawBid}
        />
      )}
    </div>
  );
}
