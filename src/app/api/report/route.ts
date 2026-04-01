import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listings, reports } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Please log in to report a listing" }, { status: 401 });
  }

  const formData = await request.formData();
  const listingId = formData.get("listingId") as string;
  const reason = formData.get("reason") as string;
  const details = (formData.get("details") as string) || null;

  if (!listingId || !reason) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
  });
  if (!listing) {
    return Response.json({ error: "Listing not found" }, { status: 404 });
  }

  if (listing.userId === session.user.id) {
    return Response.json({ error: "Cannot report your own listing" }, { status: 400 });
  }

  const existing = await db.query.reports.findFirst({
    where: and(
      eq(reports.listingId, listingId),
      eq(reports.reportedBy, session.user.id),
      eq(reports.status, "pending")
    ),
  });
  if (existing) {
    return Response.json({ error: "Already reported" }, { status: 400 });
  }

  await db.insert(reports).values({
    id: uuidv4(),
    listingId,
    reportedBy: session.user.id,
    reason: reason as "spam" | "prohibited_item" | "misleading" | "scam" | "duplicate" | "other",
    details,
  });

  return Response.json({ ok: true });
}
