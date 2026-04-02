"use server";

import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { reports, disputes, listings, users, listingViews, rentalPhotos, blockedDates, reviews, bids, conversations, messages, rentals, rentalExtensions } from "@/lib/db/schema";
import { createNotification } from "@/lib/notifications";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function reviewReport(formData: FormData) {
  await requireAdmin();

  const reportId = formData.get("reportId") as string;
  const removeListing = formData.get("removeListing") === "true";

  const report = await db.query.reports.findFirst({
    where: eq(reports.id, reportId),
  });
  if (!report) throw new Error("Report not found");

  await db
    .update(reports)
    .set({ status: "reviewed" })
    .where(eq(reports.id, reportId));

  if (removeListing) {
    const listing = await db.query.listings.findFirst({
      where: eq(listings.id, report.listingId),
    });

    await db
      .update(listings)
      .set({ status: "removed", updatedAt: new Date() })
      .where(eq(listings.id, report.listingId));

    if (listing) {
      await createNotification({
        userId: listing.userId,
        type: "listing_reported",
        title: "Listing removed",
        body: `Your listing "${listing.title}" was removed for violating our policies`,
        linkUrl: `/listing/${listing.id}`,
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/reports");
}

export async function dismissReport(formData: FormData) {
  await requireAdmin();

  const reportId = formData.get("reportId") as string;

  await db
    .update(reports)
    .set({ status: "dismissed" })
    .where(eq(reports.id, reportId));

  revalidatePath("/admin");
  revalidatePath("/admin/reports");
}

export async function resolveDispute(formData: FormData) {
  await requireAdmin();

  const disputeId = formData.get("disputeId") as string;

  const dispute = await db.query.disputes.findFirst({
    where: eq(disputes.id, disputeId),
  });
  if (!dispute) throw new Error("Dispute not found");

  await db
    .update(disputes)
    .set({ status: "resolved" })
    .where(eq(disputes.id, disputeId));

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, dispute.listingId),
  });

  await createNotification({
    userId: dispute.filedBy,
    type: "dispute_filed",
    title: "Dispute resolved",
    body: `Your dispute for "${listing?.title ?? "a listing"}" has been resolved`,
    linkUrl: `/listing/${dispute.listingId}`,
  });

  if (listing) {
    await createNotification({
      userId: listing.userId,
      type: "dispute_filed",
      title: "Dispute resolved",
      body: `A dispute on your listing "${listing.title}" has been resolved`,
      linkUrl: `/listing/${dispute.listingId}`,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/disputes");
}

export async function dismissDispute(formData: FormData) {
  await requireAdmin();

  const disputeId = formData.get("disputeId") as string;

  const dispute = await db.query.disputes.findFirst({
    where: eq(disputes.id, disputeId),
  });
  if (!dispute) throw new Error("Dispute not found");

  await db
    .update(disputes)
    .set({ status: "dismissed" })
    .where(eq(disputes.id, disputeId));

  await createNotification({
    userId: dispute.filedBy,
    type: "dispute_filed",
    title: "Dispute dismissed",
    body: "Your dispute has been reviewed and dismissed",
    linkUrl: `/listing/${dispute.listingId}`,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/disputes");
}

export async function adminRemoveListing(formData: FormData) {
  await requireAdmin();

  const listingId = formData.get("listingId") as string;

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
  });
  if (!listing) throw new Error("Listing not found");

  await db
    .update(listings)
    .set({ status: "removed", updatedAt: new Date() })
    .where(eq(listings.id, listingId));

  await createNotification({
    userId: listing.userId,
    type: "listing_reported",
    title: "Listing removed",
    body: `Your listing "${listing.title}" was removed by an admin for violating our policies`,
    linkUrl: `/listing/${listingId}`,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/listings");
}

export async function suspendUser(formData: FormData) {
  await requireAdmin();

  const userId = formData.get("userId") as string;

  await db
    .update(users)
    .set({ suspendedAt: new Date() })
    .where(eq(users.id, userId));

  await createNotification({
    userId,
    type: "listing_reported",
    title: "Account suspended",
    body: "Your account has been suspended for violating our policies. Contact support if you believe this is an error.",
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
}

export async function unsuspendUser(formData: FormData) {
  await requireAdmin();

  const userId = formData.get("userId") as string;

  await db
    .update(users)
    .set({ suspendedAt: null })
    .where(eq(users.id, userId));

  revalidatePath("/admin");
  revalidatePath("/admin/users");
}
