import { db } from "@/lib/db";
import { listings } from "@/lib/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { geocode, haversineDistance } from "@/lib/geocode";

const CONDITION_TIERS: Record<string, number> = {
  new: 5,
  like_new: 4,
  excellent: 3,
  good: 2,
  fair: 1,
  well_worn: 0,
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const categoryId = searchParams.get("categoryId");
  const condition = searchParams.get("condition");
  const location = searchParams.get("location");

  if (!categoryId && !condition) {
    return NextResponse.json({ suggestion: null });
  }

  // Build query conditions
  const where = [eq(listings.status, "active")];
  if (categoryId) {
    where.push(eq(listings.categoryId, Number(categoryId)));
  }

  const allMatches = await db
    .select({
      pricePerDay: listings.pricePerDay,
      pricePerWeek: listings.pricePerWeek,
      condition: listings.condition,
      latitude: listings.latitude,
      longitude: listings.longitude,
    })
    .from(listings)
    .where(and(...where));

  if (allMatches.length === 0) {
    return NextResponse.json({ suggestion: null });
  }

  // Score each listing by similarity
  let searchCoords: { lat: number; lng: number } | null = null;
  if (location) {
    searchCoords = await geocode(location);
  }

  const conditionTier = condition ? CONDITION_TIERS[condition] ?? -1 : -1;

  const scored = allMatches
    .filter((l) => l.pricePerDay || l.pricePerWeek)
    .map((l) => {
      let score = 1; // base score: same category

      // Condition similarity (0-2 bonus points)
      if (condition && l.condition) {
        const diff = Math.abs(
          (CONDITION_TIERS[l.condition] ?? -1) - conditionTier
        );
        if (diff === 0) score += 2;
        else if (diff === 1) score += 1;
      }

      // Proximity bonus (0-2 bonus points)
      let distance: number | null = null;
      if (
        searchCoords &&
        l.latitude != null &&
        l.longitude != null
      ) {
        distance = haversineDistance(
          searchCoords.lat,
          searchCoords.lng,
          l.latitude,
          l.longitude
        );
        if (distance <= 10) score += 2;
        else if (distance <= 50) score += 1;
      }

      return { ...l, score, distance };
    });

  if (scored.length === 0) {
    return NextResponse.json({ suggestion: null });
  }

  // Sort by score descending, take top matches
  scored.sort((a, b) => b.score - a.score);
  const topScore = scored[0].score;
  const relevant = scored.filter((s) => s.score >= topScore - 1);

  const dailyPrices = relevant
    .map((l) => l.pricePerDay)
    .filter((p): p is number => p != null && p > 0);
  const weeklyPrices = relevant
    .map((l) => l.pricePerWeek)
    .filter((p): p is number => p != null && p > 0);

  function stats(prices: number[]) {
    if (prices.length === 0) return null;
    const sorted = [...prices].sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: Math.round((prices.reduce((s, p) => s + p, 0) / prices.length) * 100) / 100,
      count: prices.length,
    };
  }

  return NextResponse.json({
    suggestion: {
      daily: stats(dailyPrices),
      weekly: stats(weeklyPrices),
      totalCompared: relevant.length,
    },
  });
}
