import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { categories, users, listings } from "./schema";
import { hash } from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { geocode } from "../geocode";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = neon(process.env.DATABASE_URL!);
const db = drizzle(client);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function seed() {
  console.log("Seeding database...");

  // Clear existing data (order matters for FK constraints)
  await db.execute(sql`DELETE FROM rental_photos`);
  await db.execute(sql`DELETE FROM listings`);
  await db.execute(sql`DELETE FROM users`);
  await db.execute(sql`DELETE FROM categories`);

  // Seed categories
  const categoryData = [
    { name: "Tools", slug: "tools" },
    { name: "Electronics", slug: "electronics" },
    { name: "Outdoor & Camping", slug: "outdoor-camping" },
    { name: "Sports & Fitness", slug: "sports-fitness" },
    { name: "Party & Events", slug: "party-events" },
    { name: "Vehicles", slug: "vehicles" },
    { name: "Home & Garden", slug: "home-garden" },
    { name: "Music & Audio", slug: "music-audio" },
    { name: "Photography", slug: "photography" },
    { name: "Other", slug: "other" },
  ];

  for (const cat of categoryData) {
    await db.insert(categories).values(cat);
  }
  console.log(`Seeded ${categoryData.length} categories`);

  // Create a demo user
  const demoId = uuidv4();
  const demoHash = await hash("password123", 12);
  await db.insert(users).values({
    id: demoId,
    name: "Demo User",
    email: "demo@rentneighbor.com",
    passwordHash: demoHash,
    location: "Brooklyn, NY",
    emailVerifiedAt: new Date(),
  });

  // Seed sample listings
  const sampleListings = [
    {
      title: "DeWalt 20V Power Drill",
      description:
        "Cordless power drill in great condition. Comes with 2 batteries and charger. Perfect for weekend projects. Good for drilling into wood, metal, and masonry.",
      pricePerDay: 15,
      pricePerWeek: 60,
      securityDeposit: 50,
      location: "Brooklyn, NY",
      categorySlug: "tools",
      contactEmail: "demo@rentneighbor.com",
    },
    {
      title: "4-Person Camping Tent",
      description:
        "REI Half Dome 4-person tent. Waterproof, easy to set up. Includes rainfly and footprint. Great for camping trips and outdoor adventures.",
      pricePerDay: 25,
      pricePerWeek: 100,
      securityDeposit: 75,
      location: "Park Slope, Brooklyn, NY",
      categorySlug: "outdoor-camping",
      contactEmail: "demo@rentneighbor.com",
    },
    {
      title: "Projector - Epson Home Cinema",
      description:
        "1080p projector, great for movie nights or presentations. HDMI cable included. Bright and clear picture quality.",
      pricePerDay: 30,
      pricePerWeek: 120,
      securityDeposit: 100,
      location: "Williamsburg, Brooklyn, NY",
      categorySlug: "electronics",
      contactEmail: "demo@rentneighbor.com",
    },
    {
      title: "Folding Tables & Chairs Set",
      description:
        "Set of 4 folding tables and 20 chairs. Great for parties, gatherings, or garage sales. Easy to transport and set up.",
      pricePerDay: 40,
      pricePerWeek: null,
      securityDeposit: null,
      location: "Bushwick, Brooklyn, NY",
      categorySlug: "party-events",
      contactEmail: "demo@rentneighbor.com",
    },
    {
      title: "Mountain Bike - Trek Marlin 7",
      description:
        "Size large, well maintained. Helmet included. Great for trail riding and exercise. Recently tuned up with new tires.",
      pricePerDay: 20,
      pricePerWeek: 80,
      securityDeposit: 100,
      location: "Fort Greene, Brooklyn, NY",
      categorySlug: "sports-fitness",
      contactEmail: "demo@rentneighbor.com",
    },
    {
      title: "Pressure Washer",
      description:
        "Electric pressure washer, 2000 PSI. Perfect for driveways, decks, and siding. Includes multiple nozzle attachments for different cleaning jobs.",
      pricePerDay: 35,
      pricePerWeek: 140,
      securityDeposit: 75,
      location: "Brooklyn Heights, NY",
      categorySlug: "tools",
      contactEmail: "demo@rentneighbor.com",
    },
  ];

  const allCats = await db.select().from(categories);
  const catMap = Object.fromEntries(allCats.map((c) => [c.slug, c.id]));

  for (const item of sampleListings) {
    const id = uuidv4();

    // Geocode the location (with rate limiting for Nominatim)
    console.log(`  Geocoding: ${item.location}...`);
    const coords = await geocode(item.location);
    if (coords) {
      console.log(`    → ${coords.lat}, ${coords.lng}`);
    } else {
      console.log(`    → Could not geocode`);
    }

    await db.insert(listings).values({
      id,
      title: item.title,
      description: item.description,
      pricePerDay: item.pricePerDay,
      pricePerWeek: item.pricePerWeek,
      securityDeposit: item.securityDeposit,
      location: item.location,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      categoryId: catMap[item.categorySlug] ?? null,
      userId: demoId,
      contactEmail: item.contactEmail,
      imageUrls: null,
      status: "active",
    });

    // Respect Nominatim rate limit (1 req/sec)
    await sleep(1100);
  }

  console.log(`Seeded ${sampleListings.length} sample listings`);
  console.log("\nDone! Demo account: demo@rentneighbor.com / password123");
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
