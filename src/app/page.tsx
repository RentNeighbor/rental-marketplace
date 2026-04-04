import { db } from "@/lib/db";
import { listings, categories, rentals, listingViews, users, reviews } from "@/lib/db/schema";
import { eq, like, desc, asc, and, gte, lte, inArray, or, count, avg, sql } from "drizzle-orm";
import ListingCard from "@/components/ListingCard";
import SearchBar from "@/components/SearchBar";
import FilterPanel from "@/components/FilterPanel";
import Pagination from "@/components/Pagination";
import { searchListingsFts } from "@/lib/db/fts";
import { geocode, haversineDistance } from "@/lib/geocode";
import { auth } from "@/lib/auth";

interface SearchParams {
  q?: string;
  location?: string;
  categories?: string;
  conditions?: string;
  minPrice?: string;
  maxPrice?: string;
  priceType?: string;
  sort?: string;
  radius?: string;
  page?: string;
  perPage?: string;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const session = await auth();
  const currentUserId = session?.user?.id;
  const allCategories = await db.select().from(categories);

  const conditions = [eq(listings.status, "active")];

  // Keyword search using FTS5
  let ftsScoreMap: Map<string, number> | null = null;
  if (params.q) {
    const ftsResult = await searchListingsFts(params.q);

    if (ftsResult.ids.length > 0) {
      // FTS5 found matches — use those IDs and keep relevance scores
      conditions.push(inArray(listings.id, ftsResult.ids));
      ftsScoreMap = ftsResult.scoreMap;
    } else {
      // FTS5 returned nothing — fall back to LIKE on title + description + location
      conditions.push(
        or(
          like(listings.title, `%${params.q}%`),
          like(listings.description, `%${params.q}%`),
          like(listings.location, `%${params.q}%`)
        )!
      );
    }
  }

  // Location search — always geocode, default to 50mi radius
  const DEFAULT_RADIUS = 50;
  const radiusMiles = params.radius ? Number(params.radius) : null;
  let searchCoords: { lat: number; lng: number } | null = null;
  let effectiveRadius: number | null = null;

  if (params.location) {
    searchCoords = await geocode(params.location);
    if (searchCoords) {
      // Use user-selected radius, or default to 25mi
      effectiveRadius = radiusMiles ?? DEFAULT_RADIUS;
    } else {
      // Geocoding failed — fall back to text matching
      conditions.push(like(listings.location, `%${params.location}%`));
    }
  }

  // Price filter
  const priceType = params.priceType || "day";
  const priceCol =
    priceType === "week" ? listings.pricePerWeek : listings.pricePerDay;

  if (params.minPrice) {
    conditions.push(gte(priceCol, Number(params.minPrice)));
  }
  if (params.maxPrice && Number(params.maxPrice) < 200) {
    conditions.push(lte(priceCol, Number(params.maxPrice)));
  }

  // Sort — relevance and distance are handled in JS after the query
  const sortMode = params.sort || (params.q ? "relevance" : "newest");
  let orderBy;
  switch (sortMode) {
    case "oldest":
      orderBy = asc(listings.createdAt);
      break;
    case "price_low":
      orderBy = asc(priceCol);
      break;
    case "price_high":
      orderBy = desc(priceCol);
      break;
    default:
      orderBy = desc(listings.createdAt);
  }

  const rawListings = await db
    .select({
      id: listings.id,
      title: listings.title,
      pricePerDay: listings.pricePerDay,
      pricePerWeek: listings.pricePerWeek,
      location: listings.location,
      latitude: listings.latitude,
      longitude: listings.longitude,
      categoryId: listings.categoryId,
      imageUrls: listings.imageUrls,
      status: listings.status,
      securityDeposit: listings.securityDeposit,
      userId: listings.userId,
      condition: listings.condition,
    })
    .from(listings)
    .where(and(...conditions))
    .orderBy(orderBy);

  // Get rental counts and 7-day view counts in two queries
  const rentalCounts = await db
    .select({ listingId: rentals.listingId, value: count() })
    .from(rentals)
    .where(or(eq(rentals.status, "completed"), eq(rentals.status, "active")))
    .groupBy(rentals.listingId);
  const rentalCountMap = new Map(rentalCounts.map((r) => [r.listingId, r.value]));

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const viewCounts = await db
    .select({ listingId: listingViews.listingId, value: count() })
    .from(listingViews)
    .where(gte(listingViews.viewedAt, sevenDaysAgo))
    .groupBy(listingViews.listingId);
  const viewCountMap = new Map(viewCounts.map((v) => [v.listingId, v.value]));

  // Get owner names and average ratings (as reviewee)
  const ownerIds = [...new Set(rawListings.map((l) => l.userId))];
  const ownerDataMap = new Map<string, { name: string; avgRating: number | null }>();
  if (ownerIds.length > 0) {
    const ownerNames = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, ownerIds));
    const ownerRatings = await db
      .select({
        revieweeId: reviews.revieweeId,
        avgRating: sql<number>`round(avg(${reviews.rating})::numeric, 1)`,
      })
      .from(reviews)
      .where(inArray(reviews.revieweeId, ownerIds))
      .groupBy(reviews.revieweeId);
    const ratingMap = new Map(ownerRatings.map((r) => [r.revieweeId, r.avgRating]));
    for (const o of ownerNames) {
      ownerDataMap.set(o.id, { name: o.name, avgRating: ratingMap.get(o.id) ?? null });
    }
  }

  // Post-query filtering
  let resultsWithDistance = rawListings.map((l) => ({
    ...l,
    distance: null as number | null,
  }));

  // Filter by multiple categories in JS
  if (params.categories) {
    const slugs = params.categories.split(",").filter(Boolean);
    const matchedCatIds = new Set(
      allCategories.filter((c) => slugs.includes(c.slug)).map((c) => c.id)
    );
    if (matchedCatIds.size > 0) {
      resultsWithDistance = resultsWithDistance.filter(
        (l) => l.categoryId && matchedCatIds.has(l.categoryId)
      );
    }
  }

  // Filter by condition in JS
  if (params.conditions) {
    const condValues = params.conditions.split(",").filter(Boolean);
    if (condValues.length > 0) {
      resultsWithDistance = resultsWithDistance.filter(
        (l) => l.condition && condValues.includes(l.condition)
      );
    }
  }

  // Distance filtering
  if (searchCoords && effectiveRadius) {
    const distanceFiltered = resultsWithDistance
      .map((l) => {
        if (l.latitude != null && l.longitude != null) {
          const dist = haversineDistance(
            searchCoords.lat,
            searchCoords.lng,
            l.latitude,
            l.longitude
          );
          return { ...l, distance: Math.round(dist * 10) / 10 };
        }
        return { ...l, distance: null };
      })
      .filter((l) => l.distance !== null && l.distance <= effectiveRadius);

    if (distanceFiltered.length > 0) {
      resultsWithDistance = distanceFiltered;
    } else {
      // Distance returned nothing — fall back to text matching
      const textMatched = resultsWithDistance.filter((l) =>
        l.location.toLowerCase().includes(params.location!.toLowerCase())
      );
      if (textMatched.length > 0) {
        resultsWithDistance = textMatched;
      }
      // If both return nothing, show all results (no location filter)
    }
  } else if (searchCoords) {
    // Calculate distance for display even without radius filter
    resultsWithDistance = resultsWithDistance.map((l) => {
      if (l.latitude != null && l.longitude != null) {
        const dist = haversineDistance(
          searchCoords!.lat,
          searchCoords!.lng,
          l.latitude,
          l.longitude
        );
        return { ...l, distance: Math.round(dist * 10) / 10 };
      }
      return l;
    });
  }

  // JS-level sorting for distance and relevance
  if (sortMode === "distance" && searchCoords) {
    resultsWithDistance.sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
  } else if (sortMode === "relevance" && ftsScoreMap) {
    // FTS5 bm25 returns negative scores (closer to 0 = better match)
    resultsWithDistance.sort((a, b) => {
      const sa = ftsScoreMap!.get(a.id) ?? 0;
      const sb = ftsScoreMap!.get(b.id) ?? 0;
      return sa - sb; // lower (more negative) = better relevance
    });
  }

  // Pagination — applied after all JS filtering/sorting
  const VALID_PER_PAGE = [10, 20, 50, 100];
  const perPage = VALID_PER_PAGE.includes(Number(params.perPage))
    ? Number(params.perPage)
    : 20;
  const currentPage = Math.max(1, Number(params.page) || 1);
  const totalResults = resultsWithDistance.length;
  const totalPages = Math.ceil(totalResults / perPage);
  const safePage = Math.min(currentPage, Math.max(1, totalPages));
  const pageStart = (safePage - 1) * perPage;
  const pagedResults = resultsWithDistance.slice(pageStart, pageStart + perPage);

  const categoryMap = Object.fromEntries(
    allCategories.map((c) => [c.id, c.name])
  );

  const hasActiveFilters = !!(
    params.q ||
    params.location ||
    params.categories ||
    params.conditions ||
    params.minPrice ||
    (params.maxPrice && Number(params.maxPrice) < 200) ||
    params.sort ||
    params.radius
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Header + Search */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Rent anything from your neighbors
        </h1>
        <p className="text-gray-400 text-sm mb-5">
          Tools, gear, electronics, and more &mdash; available nearby.
        </p>
        <SearchBar />
      </div>

      {/* Main layout: sidebar + grid */}
      <div className="flex gap-8">
        {/* Left filter panel */}
        <aside className="shrink-0" style={{ width: "300px" }}>
          <div className="sticky top-6">
            <FilterPanel categories={allCategories} />
          </div>
        </aside>

        {/* Listings grid */}
        <div className="flex-1 min-w-0">
          {hasActiveFilters && (
            <p className="text-sm text-gray-400 mb-4">
              {totalResults} result{totalResults !== 1 ? "s" : ""} found
              {searchCoords && effectiveRadius
                ? ` within ${effectiveRadius} mi`
                : ""}
            </p>
          )}

          {totalResults === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg">No listings found</p>
              <p className="text-sm mt-1">
                {hasActiveFilters
                  ? "Try adjusting your filters or expanding the radius"
                  : "Be the first to post something!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {pagedResults.map((listing) => (
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
                  distance={listing.distance}
                  showReportFlag={!currentUserId || listing.userId !== currentUserId}
                  categoryName={
                    listing.categoryId
                      ? categoryMap[listing.categoryId]
                      : undefined
                  }
                  rentalCount={rentalCountMap.get(listing.id) ?? 0}
                  viewCount={viewCountMap.get(listing.id) ?? 0}
                  ownerName={ownerDataMap.get(listing.userId)?.name}
                  ownerRating={ownerDataMap.get(listing.userId)?.avgRating}
                />
              ))}
            </div>
          )}

        </div>
      </div>

      {totalResults > 0 && (
        <Pagination
          totalResults={totalResults}
          currentPage={safePage}
          perPage={perPage}
        />
      )}
    </div>
  );
}
