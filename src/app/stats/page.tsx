import { db } from "@/lib/db";
import { rentals, listings, reviews } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

function daysBetween(a: Date, b: Date) {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

export default async function StatsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  // ---------- Fetch all data in parallel ----------
  const [ownerRentals, renterRentals, myListings, ownerReviews] =
    await Promise.all([
      db
        .select({
          id: rentals.id,
          listingId: rentals.listingId,
          startDate: rentals.startDate,
          endDate: rentals.endDate,
          totalPrice: rentals.totalPrice,
          depositAmount: rentals.depositAmount,
          status: rentals.status,
          createdAt: rentals.createdAt,
        })
        .from(rentals)
        .where(eq(rentals.ownerId, userId))
        .orderBy(desc(rentals.createdAt)),
      db
        .select({
          id: rentals.id,
          listingId: rentals.listingId,
          startDate: rentals.startDate,
          endDate: rentals.endDate,
          totalPrice: rentals.totalPrice,
          status: rentals.status,
          createdAt: rentals.createdAt,
        })
        .from(rentals)
        .where(eq(rentals.renterId, userId))
        .orderBy(desc(rentals.createdAt)),
      db
        .select({
          id: listings.id,
          title: listings.title,
          pricePerDay: listings.pricePerDay,
          pricePerWeek: listings.pricePerWeek,
          status: listings.status,
          createdAt: listings.createdAt,
        })
        .from(listings)
        .where(eq(listings.userId, userId)),
      db
        .select({
          rating: reviews.rating,
          role: reviews.role,
          createdAt: reviews.createdAt,
        })
        .from(reviews)
        .where(eq(reviews.revieweeId, userId)),
    ]);

  // ---------- Revenue stats (as owner) ----------
  const completed = ownerRentals.filter((r) => r.status === "completed");
  const activeAndCompleted = ownerRentals.filter(
    (r) => r.status === "completed" || r.status === "active"
  );

  const totalRevenue = completed.reduce(
    (sum, r) => sum + (r.totalPrice ?? 0),
    0
  );
  const pendingRevenue = ownerRentals
    .filter((r) => r.status === "active" || r.status === "pending")
    .reduce((sum, r) => sum + (r.totalPrice ?? 0), 0);

  // Monthly revenue (last 12 months)
  const now = new Date();
  const monthlyRevenue: { month: string; amount: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    const monthStart = d;
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const monthTotal = completed
      .filter((r) => r.endDate >= monthStart && r.endDate <= monthEnd)
      .reduce((sum, r) => sum + (r.totalPrice ?? 0), 0);
    monthlyRevenue.push({ month: label, amount: monthTotal });
  }
  const maxMonthly = Math.max(...monthlyRevenue.map((m) => m.amount), 1);

  // ---------- Rental duration stats ----------
  const durations = activeAndCompleted.map((r) =>
    daysBetween(r.startDate, r.endDate)
  );
  const avgDuration =
    durations.length > 0
      ? Math.round(
          (durations.reduce((s, d) => s + d, 0) / durations.length) * 10
        ) / 10
      : 0;
  const shortestRental = durations.length > 0 ? Math.min(...durations) : 0;
  const longestRental = durations.length > 0 ? Math.max(...durations) : 0;

  // ---------- Average prices rented at ----------
  const rentedDailyRates = activeAndCompleted
    .filter((r) => r.totalPrice && r.totalPrice > 0)
    .map((r) => {
      const days = daysBetween(r.startDate, r.endDate);
      return r.totalPrice! / days;
    });
  const avgDailyRate =
    rentedDailyRates.length > 0
      ? Math.round(
          (rentedDailyRates.reduce((s, d) => s + d, 0) /
            rentedDailyRates.length) *
            100
        ) / 100
      : null;
  const avgWeeklyRate = avgDailyRate ? Math.round(avgDailyRate * 7 * 100) / 100 : null;

  // ---------- Top earning listings ----------
  const revenueByListing: Record<string, number> = {};
  const rentalCountByListing: Record<string, number> = {};
  for (const r of completed) {
    revenueByListing[r.listingId] =
      (revenueByListing[r.listingId] ?? 0) + (r.totalPrice ?? 0);
    rentalCountByListing[r.listingId] =
      (rentalCountByListing[r.listingId] ?? 0) + 1;
  }
  const listingMap = Object.fromEntries(myListings.map((l) => [l.id, l]));
  const topListings = Object.entries(revenueByListing)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lid, rev]) => ({
      id: lid,
      title: listingMap[lid]?.title ?? "Deleted listing",
      revenue: rev,
      rentalCount: rentalCountByListing[lid] ?? 0,
    }));

  // ---------- Conversion rate ----------
  const totalRequests = ownerRentals.length;
  const approvedCount = ownerRentals.filter(
    (r) => r.status === "completed" || r.status === "active"
  ).length;
  const conversionRate =
    totalRequests > 0 ? Math.round((approvedCount / totalRequests) * 100) : 0;
  const declinedCount = ownerRentals.filter(
    (r) => r.status === "declined"
  ).length;
  const cancelledCount = ownerRentals.filter(
    (r) => r.status === "cancelled"
  ).length;

  // ---------- Reviews ----------
  const ownerRatings = ownerReviews.filter((r) => r.role === "renter"); // renters reviewing this owner
  const avgRating =
    ownerRatings.length > 0
      ? Math.round(
          (ownerRatings.reduce((s, r) => s + r.rating, 0) /
            ownerRatings.length) *
            10
        ) / 10
      : null;
  const ratingDist = [0, 0, 0, 0, 0];
  ownerRatings.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) ratingDist[r.rating - 1]++;
  });

  // ---------- Renter stats ----------
  const renterCompleted = renterRentals.filter(
    (r) => r.status === "completed" || r.status === "active"
  );
  const totalSpent = renterCompleted.reduce(
    (sum, r) => sum + (r.totalPrice ?? 0),
    0
  );
  const renterDurations = renterCompleted.map((r) =>
    daysBetween(r.startDate, r.endDate)
  );
  const avgRenterDuration =
    renterDurations.length > 0
      ? Math.round(
          (renterDurations.reduce((s, d) => s + d, 0) /
            renterDurations.length) *
            10
        ) / 10
      : 0;

  // ---------- Listing stats ----------
  const activeListings = myListings.filter((l) => l.status === "active").length;
  const avgListedPrice =
    myListings.filter((l) => l.pricePerDay).length > 0
      ? Math.round(
          (myListings
            .filter((l) => l.pricePerDay)
            .reduce((s, l) => s + l.pricePerDay!, 0) /
            myListings.filter((l) => l.pricePerDay).length) *
            100
        ) / 100
      : null;

  // ---------- Render ----------
  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Stats</h1>
        <Link
          href="/dashboard"
          className="text-sm text-green-700 hover:underline"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Top-level KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Earned"
          value={`$${totalRevenue.toFixed(2)}`}
          sub={`${completed.length} completed rental${completed.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          label="Pending Revenue"
          value={`$${pendingRevenue.toFixed(2)}`}
          sub="Active + pending"
        />
        <StatCard
          label="Avg Rental Duration"
          value={`${avgDuration} day${avgDuration !== 1 ? "s" : ""}`}
          sub={
            durations.length > 0
              ? `${shortestRental}–${longestRental} day range`
              : "No data"
          }
        />
        <StatCard
          label="Approval Rate"
          value={`${conversionRate}%`}
          sub={`${approvedCount} of ${totalRequests} requests`}
        />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Avg Daily Rate"
          value={avgDailyRate ? `$${avgDailyRate.toFixed(2)}` : "—"}
          sub="Actual rental rate"
        />
        <StatCard
          label="Avg Weekly Rate"
          value={avgWeeklyRate ? `$${avgWeeklyRate.toFixed(2)}` : "—"}
          sub="Projected from daily"
        />
        <StatCard
          label="Active Listings"
          value={String(activeListings)}
          sub={`${myListings.length} total`}
        />
        <StatCard
          label="Avg Listed Price"
          value={avgListedPrice ? `$${avgListedPrice.toFixed(2)}/day` : "—"}
          sub="Across your listings"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Revenue chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">
            Monthly Revenue (Last 12 Months)
          </h2>
          {totalRevenue === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              No completed rentals yet
            </p>
          ) : (
            <div className="flex items-end gap-1.5 h-36">
              {monthlyRevenue.map((m) => (
                <div
                  key={m.month}
                  className="flex-1 flex flex-col items-center justify-end"
                >
                  <div
                    className="w-full bg-green-500 rounded-t transition-all"
                    style={{
                      height: `${Math.max(
                        (m.amount / maxMonthly) * 100,
                        m.amount > 0 ? 4 : 0
                      )}%`,
                      minHeight: m.amount > 0 ? "4px" : "0px",
                    }}
                    title={`$${m.amount.toFixed(2)}`}
                  />
                  <span className="text-[9px] text-gray-400 mt-1 leading-none">
                    {m.month}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Request breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">
            Request Breakdown
          </h2>
          {totalRequests === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              No rental requests yet
            </p>
          ) : (
            <div className="space-y-3">
              <BreakdownRow
                label="Completed"
                count={completed.length}
                total={totalRequests}
                color="bg-green-500"
              />
              <BreakdownRow
                label="Active"
                count={
                  ownerRentals.filter((r) => r.status === "active").length
                }
                total={totalRequests}
                color="bg-blue-500"
              />
              <BreakdownRow
                label="Pending"
                count={
                  ownerRentals.filter((r) => r.status === "pending").length
                }
                total={totalRequests}
                color="bg-yellow-500"
              />
              <BreakdownRow
                label="Declined"
                count={declinedCount}
                total={totalRequests}
                color="bg-red-400"
              />
              <BreakdownRow
                label="Cancelled"
                count={cancelledCount}
                total={totalRequests}
                color="bg-gray-400"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Top earners */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">
            Top Earning Listings
          </h2>
          {topListings.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              No completed rentals yet
            </p>
          ) : (
            <div className="space-y-2.5">
              {topListings.map((l, i) => (
                <div
                  key={l.id}
                  className="flex items-center gap-3 text-sm"
                >
                  <span className="w-5 text-xs text-gray-400 font-medium text-right">
                    {i + 1}.
                  </span>
                  <Link
                    href={`/listing/${l.id}`}
                    className="flex-1 text-gray-700 hover:text-green-700 truncate"
                  >
                    {l.title}
                  </Link>
                  <span className="text-xs text-gray-400">
                    {l.rentalCount} rental{l.rentalCount !== 1 ? "s" : ""}
                  </span>
                  <span className="font-medium text-green-700 text-sm">
                    ${l.revenue.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rating overview */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">
            Your Ratings
          </h2>
          {ownerRatings.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              No reviews yet
            </p>
          ) : (
            <div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold text-gray-900">
                  {avgRating?.toFixed(1)}
                </span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg
                      key={s}
                      className={`w-4 h-4 ${
                        s <= Math.round(avgRating ?? 0)
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
                  ({ownerRatings.length} review
                  {ownerRatings.length !== 1 ? "s" : ""})
                </span>
              </div>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-gray-500 text-right">
                      {star}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full"
                        style={{
                          width: `${
                            ownerRatings.length > 0
                              ? (ratingDist[star - 1] / ownerRatings.length) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="w-5 text-gray-400 text-right">
                      {ratingDist[star - 1]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* As renter section */}
      {renterRentals.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            As a Renter
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Spent"
              value={`$${totalSpent.toFixed(2)}`}
              sub={`${renterCompleted.length} rental${renterCompleted.length !== 1 ? "s" : ""}`}
            />
            <StatCard
              label="Avg Rental Length"
              value={`${avgRenterDuration} day${avgRenterDuration !== 1 ? "s" : ""}`}
              sub="As a renter"
            />
            <StatCard
              label="Active Rentals"
              value={String(
                renterRentals.filter((r) => r.status === "active").length
              )}
              sub="Currently renting"
            />
            <StatCard
              label="Total Requests"
              value={String(renterRentals.length)}
              sub={`${renterRentals.filter((r) => r.status === "declined" || r.status === "cancelled").length} declined/cancelled`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function BreakdownRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-400">
          {count} ({pct}%)
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
