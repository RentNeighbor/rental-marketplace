import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { listings, categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://rentneighbors.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const activeListings = await db
    .select({ id: listings.id, updatedAt: listings.updatedAt })
    .from(listings)
    .where(eq(listings.status, "active"));

  const allCategories = await db.select({ slug: categories.slug }).from(categories);

  const listingUrls: MetadataRoute.Sitemap = activeListings.map((l) => ({
    url: `${BASE_URL}/listing/${l.id}`,
    lastModified: l.updatedAt,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const categoryUrls: MetadataRoute.Sitemap = allCategories.map((c) => ({
    url: `${BASE_URL}/?categories=${c.slug}`,
    changeFrequency: "daily",
    priority: 0.5,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/login`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/register`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/faq`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      changeFrequency: "monthly",
      priority: 0.2,
    },
    ...categoryUrls,
    ...listingUrls,
  ];
}
