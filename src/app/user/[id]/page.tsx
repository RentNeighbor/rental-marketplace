import { db } from "@/lib/db";
import { users, listings, categories, reviews, disputes, reports } from "@/lib/db/schema";
import { eq, desc, and, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import ListingCard from "@/components/ListingCard";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) notFound();

  const isOwnProfile = session?.user?.id === id;

  const allCategories = await db.select().from(categories);
  const categoryMap = Object.fromEntries(
    allCategories.map((c) => [c.id, c.name])
  );

  // Show all listings for own profile, only active for others
  const conditions = isOwnProfile
    ? [eq(listings.userId, id)]
    : [eq(listings.userId, id), eq(listings.status, "active")];

  const userListings = await db
    .select()
    .from(listings)
    .where(and(...conditions))
    .orderBy(desc(listings.createdAt));

  const activeCount = userListings.filter((l) => l.status === "active").length;
  const memberSince = user.createdAt.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Reputation: reviews received
  const userReviews = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      role: reviews.role,
      reviewerId: reviews.reviewerId,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .where(eq(reviews.revieweeId, id))
    .orderBy(desc(reviews.createdAt));

  // Get reviewer names
  const reviewerIds = [...new Set(userReviews.map((r) => r.reviewerId))];
  const reviewerUsers = await Promise.all(
    reviewerIds.map((rid) =>
      db.query.users.findFirst({ where: eq(users.id, rid) })
    )
  );
  const reviewerMap = Object.fromEntries(
    reviewerUsers.filter(Boolean).map((u) => [u!.id, u!.name])
  );

  const avgRating =
    userReviews.length > 0
      ? userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length
      : null;

  // Reputation: disputes (as owner — disputes filed against their listings)
  const listingIds = userListings.map((l) => l.id);
  let disputesAgainst: { status: string }[] = [];
  if (listingIds.length > 0) {
    disputesAgainst = await db
      .select({ status: disputes.status })
      .from(disputes)
      .where(
        and(
          or(...listingIds.map((lid) => eq(disputes.listingId, lid)))
        )
      );
  }
  const openDisputes = disputesAgainst.filter((d) => d.status === "open").length;
  const totalDisputes = disputesAgainst.length;

  // Reputation: reports against their listings
  let reportsAgainst: { status: string }[] = [];
  if (listingIds.length > 0) {
    reportsAgainst = await db
      .select({ status: reports.status })
      .from(reports)
      .where(
        and(
          or(...listingIds.map((lid) => eq(reports.listingId, lid)))
        )
      );
  }
  const totalReports = reportsAgainst.length;

  // Completed rentals (listings that have been rented at least once — approximated by having check-in photos)
  const completedRentals = userListings.filter(
    (l) => l.status === "rented" || l.status === "active"
  ).length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Profile header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="shrink-0 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-2xl font-bold text-green-700">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
              {isOwnProfile && (
                <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                  You
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
              {user.location && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                  {user.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                Member since {memberSince}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
                {activeCount} active listing{activeCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {isOwnProfile && (
            <Link
              href="/post"
              className="shrink-0 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
            >
              Post New
            </Link>
          )}
        </div>
      </div>

      {/* Reputation section */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {/* Rating */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            {avgRating !== null ? (
              <>
                <svg className="w-5 h-5 text-yellow-400 fill-yellow-400" viewBox="0 0 24 24">
                  <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                </svg>
                <span className="text-xl font-bold text-gray-900">
                  {avgRating.toFixed(1)}
                </span>
              </>
            ) : (
              <span className="text-xl font-bold text-gray-300">&mdash;</span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {userReviews.length} review{userReviews.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Listings */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-gray-900">{activeCount}</p>
          <p className="text-xs text-gray-400">Active listings</p>
        </div>

        {/* Disputes */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className={`text-xl font-bold ${totalDisputes > 0 ? "text-amber-600" : "text-gray-900"}`}>
            {totalDisputes}
          </p>
          <p className="text-xs text-gray-400">
            Dispute{totalDisputes !== 1 ? "s" : ""}
            {openDisputes > 0 && (
              <span className="text-amber-500"> ({openDisputes} open)</span>
            )}
          </p>
        </div>

        {/* Reports */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className={`text-xl font-bold ${totalReports > 0 ? "text-red-500" : "text-gray-900"}`}>
            {totalReports}
          </p>
          <p className="text-xs text-gray-400">
            Report{totalReports !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Reviews */}
      {userReviews.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
            Reviews
          </h2>
          <div className="space-y-3">
            {userReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white border border-gray-200 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
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
                        {reviewerMap[review.reviewerId] || "Unknown"}
                      </Link>
                    </span>
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">
                      as {review.role}
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
        </div>
      )}

      {/* Listings */}
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
        {isOwnProfile ? "Your Listings" : `${user.name}'s Listings`}
      </h2>

      {userListings.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl text-gray-400">
          <p className="text-lg">No listings yet</p>
          {isOwnProfile && (
            <Link
              href="/post"
              className="text-green-700 hover:underline text-sm mt-2 inline-block"
            >
              Post your first item
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {userListings.map((listing) => (
            <ListingCard
              key={listing.id}
              id={listing.id}
              title={listing.title}
              pricePerDay={listing.pricePerDay}
              pricePerWeek={listing.pricePerWeek}
              location={listing.location}
              imageUrls={listing.imageUrls}
              status={listing.status}
              securityDeposit={listing.securityDeposit}
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
