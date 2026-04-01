"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listings, rentalPhotos, reports, disputes, reviews, conversations, messages, rentals, bids, notificationPreferences, blockedDates, users, rentalExtensions } from "@/lib/db/schema";
import { createNotification } from "@/lib/notifications";
import { getUnavailableDateRanges, rangesOverlap } from "@/lib/availability";
import { eq, and, or, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { geocode } from "@/lib/geocode";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import {
  parseNonNegativeNumberOrNull,
  parsePositiveNumber,
  parseIntegerInRange,
  parseEnum,
  REPORT_REASONS,
  DISPUTE_REASONS,
  RENTAL_PHOTO_TYPES,
  LISTING_CONDITIONS,
  REVIEW_ROLES,
  MAX_PRICE,
  calculateRentalFee,
  calculatePlatformSplit,
} from "@/lib/validation";

async function requireVerifiedUser(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user?.emailVerifiedAt) {
    throw new Error("Please verify your email before performing this action");
  }
  return user;
}

export async function createListing(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await requireVerifiedUser(session.user.id);

  const id = uuidv4();
  const location = formData.get("location") as string;

  // Geocode the location
  const coords = await geocode(location);

  await db.insert(listings).values({
    id,
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    pricePerDay: parseNonNegativeNumberOrNull(formData.get("pricePerDay"), "Price per day", MAX_PRICE),
    pricePerWeek: parseNonNegativeNumberOrNull(formData.get("pricePerWeek"), "Price per week", MAX_PRICE),
    securityDeposit: parseNonNegativeNumberOrNull(formData.get("securityDeposit"), "Security deposit", MAX_PRICE),
    location,
    latitude: coords?.lat ?? null,
    longitude: coords?.lng ?? null,
    categoryId: formData.get("categoryId")
      ? Number(formData.get("categoryId"))
      : null,
    userId: session.user.id,
    contactEmail: formData.get("contactEmail") as string,
    imageUrls: (formData.get("imageUrls") as string) || null,
    condition: formData.get("condition")
      ? parseEnum(formData.get("condition"), LISTING_CONDITIONS, "condition")
      : null,
    status: "active",
  });

  // FTS5 is synced automatically via SQLite trigger

  revalidatePath("/");
  redirect(`/listing/${id}`);
}

export async function updateListing(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await requireVerifiedUser(session.user.id);

  const id = formData.get("id") as string;

  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, id), eq(listings.userId, session.user.id)),
  });
  if (!listing) throw new Error("Not found or unauthorized");

  const newLocation = formData.get("location") as string;

  // Re-geocode if location changed
  let latitude = listing.latitude;
  let longitude = listing.longitude;
  if (newLocation !== listing.location) {
    const coords = await geocode(newLocation);
    latitude = coords?.lat ?? null;
    longitude = coords?.lng ?? null;
  }

  await db
    .update(listings)
    .set({
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      pricePerDay: parseNonNegativeNumberOrNull(formData.get("pricePerDay"), "Price per day", MAX_PRICE),
      pricePerWeek: parseNonNegativeNumberOrNull(formData.get("pricePerWeek"), "Price per week", MAX_PRICE),
      securityDeposit: parseNonNegativeNumberOrNull(formData.get("securityDeposit"), "Security deposit", MAX_PRICE),
      location: newLocation,
      latitude,
      longitude,
      categoryId: formData.get("categoryId")
        ? Number(formData.get("categoryId"))
        : null,
      contactEmail: formData.get("contactEmail") as string,
      imageUrls: (formData.get("imageUrls") as string) || null,
      condition: formData.get("condition")
        ? parseEnum(formData.get("condition"), LISTING_CONDITIONS, "condition")
        : null,
      status: parseEnum(formData.get("status"), ["active", "paused", "rented"] as const, "status"),
      updatedAt: new Date(),
    })
    .where(eq(listings.id, id));

  // FTS5 is synced automatically via SQLite trigger

  revalidatePath("/");
  revalidatePath(`/listing/${id}`);
  redirect(`/listing/${id}`);
}

export async function deleteListing(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const id = formData.get("id") as string;

  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, id), eq(listings.userId, session.user.id)),
  });
  if (!listing) throw new Error("Not found or unauthorized");

  // FTS5 is synced automatically via SQLite trigger
  await db.delete(listings).where(eq(listings.id, id));

  revalidatePath("/");
  redirect("/dashboard");
}

export async function submitRentalPhoto(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const listingId = formData.get("listingId") as string;
  const type = parseEnum(formData.get("type"), RENTAL_PHOTO_TYPES, "type");
  const photoUrl = formData.get("photoUrl") as string;
  const notes = (formData.get("notes") as string) || null;

  if (!listingId || !photoUrl) {
    throw new Error("Missing required fields");
  }

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
  });
  if (!listing) throw new Error("Listing not found");

  // Verify uploader is the listing owner or an active renter
  const activeRental = await db.query.rentals.findFirst({
    where: and(
      eq(rentals.listingId, listingId),
      eq(rentals.renterId, session.user.id),
      eq(rentals.status, "active")
    ),
  });
  if (listing.userId !== session.user.id && !activeRental) {
    throw new Error("You must be the owner or an active renter to upload photos");
  }

  await db.insert(rentalPhotos).values({
    id: uuidv4(),
    listingId,
    uploadedBy: session.user.id,
    type,
    photoUrl,
    notes,
  });

  revalidatePath(`/listing/${listingId}`);
  redirect(`/listing/${listingId}`);
}

export async function reportListing(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const listingId = formData.get("listingId") as string;
  const reason = formData.get("reason") as string;
  const details = (formData.get("details") as string) || null;

  if (!listingId || !reason) {
    throw new Error("Missing required fields");
  }

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
  });
  if (!listing) throw new Error("Listing not found");

  // Prevent users from reporting their own listings
  if (listing.userId === session.user.id) {
    throw new Error("You cannot report your own listing");
  }

  // Check for existing pending report from this user on this listing
  const existing = await db.query.reports.findFirst({
    where: and(
      eq(reports.listingId, listingId),
      eq(reports.reportedBy, session.user.id),
      eq(reports.status, "pending")
    ),
  });
  if (existing) {
    throw new Error("You have already reported this listing");
  }

  await db.insert(reports).values({
    id: uuidv4(),
    listingId,
    reportedBy: session.user.id,
    reason: parseEnum(reason, REPORT_REASONS, "reason"),
    details,
  });

  await createNotification({
    userId: listing.userId,
    type: "listing_reported",
    title: "Listing reported",
    body: `Your listing "${listing.title}" has been reported for ${reason.replace(/_/g, " ")}`,
    linkUrl: `/listing/${listingId}`,
  });

  revalidatePath(`/listing/${listingId}`);
}

export async function submitDispute(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const listingId = formData.get("listingId") as string;
  const reason = formData.get("reason") as string;
  const details = (formData.get("details") as string) || null;

  if (!listingId || !reason) {
    throw new Error("Missing required fields");
  }

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
  });
  if (!listing) throw new Error("Listing not found");

  // Prevent owners from filing disputes on their own listings
  if (listing.userId === session.user.id) {
    throw new Error("Owners cannot file deposit disputes on their own listings");
  }

  // Check for existing open dispute from this user on this listing
  const existing = await db.query.disputes.findFirst({
    where: and(
      eq(disputes.listingId, listingId),
      eq(disputes.filedBy, session.user.id),
      eq(disputes.status, "open")
    ),
  });
  if (existing) {
    throw new Error("You already have an open dispute for this listing");
  }

  await db.insert(disputes).values({
    id: uuidv4(),
    listingId,
    filedBy: session.user.id,
    reason: parseEnum(reason, DISPUTE_REASONS, "reason"),
    details,
  });

  await createNotification({
    userId: listing.userId,
    type: "dispute_filed",
    title: "Dispute filed",
    body: `A dispute has been filed on your listing "${listing.title}" for ${reason.replace(/_/g, " ")}`,
    linkUrl: `/listing/${listingId}`,
  });

  revalidatePath(`/listing/${listingId}`);
}

export async function submitReview(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const listingId = formData.get("listingId") as string;
  const revieweeId = formData.get("revieweeId") as string;
  const role = parseEnum(formData.get("role"), REVIEW_ROLES, "role");
  const rating = parseIntegerInRange(formData.get("rating"), 1, 5, "Rating");
  const comment = (formData.get("comment") as string) || null;

  if (!listingId || !revieweeId) {
    throw new Error("Missing required fields");
  }

  if (session.user.id === revieweeId) {
    throw new Error("You cannot review yourself");
  }

  // Check for existing review from this user on this listing
  const existing = await db.query.reviews.findFirst({
    where: and(
      eq(reviews.listingId, listingId),
      eq(reviews.reviewerId, session.user.id)
    ),
  });
  if (existing) {
    throw new Error("You have already reviewed this rental");
  }

  await db.insert(reviews).values({
    id: uuidv4(),
    listingId,
    reviewerId: session.user.id,
    revieweeId,
    role,
    rating,
    comment,
  });

  await createNotification({
    userId: revieweeId,
    type: "new_review",
    title: "New review",
    body: `${session.user.name} left you a ${rating}-star review`,
    linkUrl: `/listing/${listingId}`,
  });

  revalidatePath(`/listing/${listingId}`);
  revalidatePath(`/user/${revieweeId}`);
}

export async function startConversation(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const listingId = formData.get("listingId") as string;
  const message = formData.get("message") as string;

  if (!listingId || !message?.trim()) {
    throw new Error("Please enter a message");
  }

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
  });
  if (!listing) throw new Error("Listing not found");

  if (listing.userId === session.user.id) {
    throw new Error("You cannot message yourself");
  }

  // Check for existing conversation
  let conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.listingId, listingId),
      eq(conversations.renterId, session.user.id)
    ),
  });

  if (!conversation) {
    const convId = uuidv4();
    await db.insert(conversations).values({
      id: convId,
      listingId,
      renterId: session.user.id,
      ownerId: listing.userId,
    });
    conversation = { id: convId, listingId, renterId: session.user.id, ownerId: listing.userId, createdAt: new Date(), updatedAt: new Date() };
  }

  await db.insert(messages).values({
    id: uuidv4(),
    conversationId: conversation.id,
    senderId: session.user.id,
    body: message.trim(),
  });

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversation.id));

  await createNotification({
    userId: listing.userId,
    type: "new_message",
    title: "New message",
    body: `${session.user.name} sent you a message about "${listing.title}"`,
    linkUrl: `/messages/${conversation.id}`,
  });

  revalidatePath("/messages");
  redirect(`/messages/${conversation.id}`);
}

export async function sendMessage(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const conversationId = formData.get("conversationId") as string;
  const body = formData.get("body") as string;

  if (!conversationId || !body?.trim()) {
    throw new Error("Please enter a message");
  }

  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });
  if (!conversation) throw new Error("Conversation not found");

  if (conversation.renterId !== session.user.id && conversation.ownerId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  await db.insert(messages).values({
    id: uuidv4(),
    conversationId,
    senderId: session.user.id,
    body: body.trim(),
  });

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  const recipientId =
    conversation.renterId === session.user.id
      ? conversation.ownerId
      : conversation.renterId;

  await createNotification({
    userId: recipientId,
    type: "new_message",
    title: "New message",
    body: `${session.user.name} sent you a message`,
    linkUrl: `/messages/${conversationId}`,
  });

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
}

export async function requestRental(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await requireVerifiedUser(session.user.id);

  const listingId = formData.get("listingId") as string;
  const startDateStr = formData.get("startDate") as string;
  const endDateStr = formData.get("endDate") as string;

  if (!listingId || !startDateStr || !endDateStr) {
    throw new Error("Please select start and end dates");
  }

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
  });
  if (!listing) throw new Error("Listing not found");

  if (listing.userId === session.user.id) {
    throw new Error("You cannot rent your own item");
  }

  if (listing.status !== "active") {
    throw new Error("This item is not available for rent");
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate < today) {
    throw new Error("Start date cannot be in the past");
  }
  if (endDate <= startDate) {
    throw new Error("End date must be after start date");
  }

  // Check for date conflicts with blocked dates and existing rentals
  const { blockedRanges, bookedRanges } = await getUnavailableDateRanges(listingId);

  for (const b of blockedRanges) {
    if (rangesOverlap(startDate, endDate, new Date(b.start), new Date(b.end))) {
      throw new Error("Selected dates overlap with unavailable dates");
    }
  }

  for (const r of bookedRanges) {
    if (rangesOverlap(startDate, endDate, new Date(r.start), new Date(r.end))) {
      throw new Error("Selected dates overlap with an existing rental");
    }
  }

  // Calculate total price
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  let totalPrice: number | null = null;
  if (listing.pricePerDay) {
    totalPrice = listing.pricePerDay * days;
  } else if (listing.pricePerWeek) {
    totalPrice = listing.pricePerWeek * Math.ceil(days / 7);
  }

  await db.insert(rentals).values({
    id: uuidv4(),
    listingId,
    renterId: session.user.id,
    ownerId: listing.userId,
    startDate,
    endDate,
    totalPrice,
    status: "pending",
  });

  await createNotification({
    userId: listing.userId,
    type: "rental_requested",
    title: "New rental request",
    body: `${session.user.name} wants to rent "${listing.title}"`,
    linkUrl: `/listing/${listingId}`,
  });

  revalidatePath(`/listing/${listingId}`);
  revalidatePath("/dashboard");
  revalidatePath("/rentals");
}

export async function initiateRentalCheckout(
  formData: FormData
): Promise<{ checkoutUrl: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await requireVerifiedUser(session.user.id);

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  if (!user?.stripeIdentityVerified) {
    throw new Error("Please verify your identity before renting.");
  }

  const listingId = formData.get("listingId") as string;
  const startDateStr = formData.get("startDate") as string;
  const endDateStr = formData.get("endDate") as string;

  if (!listingId || !startDateStr || !endDateStr) {
    throw new Error("Please select start and end dates");
  }

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
  });
  if (!listing) throw new Error("Listing not found");
  if (listing.userId === session.user.id) throw new Error("You cannot rent your own item");
  if (listing.status !== "active") throw new Error("This item is not available for rent");

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate < today) throw new Error("Start date cannot be in the past");
  if (endDate <= startDate) throw new Error("End date must be after start date");

  const { blockedRanges, bookedRanges } = await getUnavailableDateRanges(listingId);
  for (const b of blockedRanges) {
    if (rangesOverlap(startDate, endDate, new Date(b.start), new Date(b.end))) {
      throw new Error("Selected dates overlap with unavailable dates");
    }
  }
  for (const r of bookedRanges) {
    if (rangesOverlap(startDate, endDate, new Date(r.start), new Date(r.end))) {
      throw new Error("Selected dates overlap with an existing rental");
    }
  }

  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const rentalFee = calculateRentalFee(days, listing.pricePerDay, listing.pricePerWeek);
  const depositAmount = listing.securityDeposit ?? 0;
  const totalPrice = rentalFee + depositAmount;

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const lineItems: {product_data: {name: string}; unit_amount: number; quantity: number}[] = [];

  if (rentalFee > 0) {
    lineItems.push({
      product_data: { name: `Rental: ${listing.title} (${days} day${days !== 1 ? "s" : ""})` },
      unit_amount: Math.round(rentalFee * 100),
      quantity: 1,
    });
  }
  if (depositAmount > 0) {
    lineItems.push({
      product_data: { name: `Security deposit (refundable): ${listing.title}` },
      unit_amount: Math.round(depositAmount * 100),
      quantity: 1,
    });
  }
  if (lineItems.length === 0) {
    throw new Error("No price set for this listing");
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    success_url: `${baseUrl}/payment-success`,
    cancel_url: `${baseUrl}/listing/${listingId}`,
    metadata: {
      listingId,
      renterId: session.user.id,
      ownerId: listing.userId,
      startDate: startDateStr,
      endDate: endDateStr,
      totalPrice: String(totalPrice),
      depositAmount: String(depositAmount),
    },
    payment_intent_data: {
      metadata: {
        listingId,
        renterId: session.user.id,
        ownerId: listing.userId,
      },
    },
  });

  return { checkoutUrl: checkoutSession.url! };
}

export async function approveRental(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const rentalId = formData.get("rentalId") as string;

  const rental = await db.query.rentals.findFirst({
    where: eq(rentals.id, rentalId),
  });
  if (!rental) throw new Error("Rental not found");
  if (rental.ownerId !== session.user.id) throw new Error("Unauthorized");
  if (rental.status !== "pending") throw new Error("Rental is not pending");

  await db
    .update(rentals)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(rentals.id, rentalId));

  await db
    .update(listings)
    .set({ status: "rented", updatedAt: new Date() })
    .where(eq(listings.id, rental.listingId));

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, rental.listingId),
  });

  await createNotification({
    userId: rental.renterId,
    type: "rental_approved",
    title: "Rental approved",
    body: `Your rental request for "${listing?.title ?? "an item"}" has been approved`,
    linkUrl: `/listing/${rental.listingId}`,
  });

  // Decline any other pending rentals for this listing
  const otherPending = await db
    .select({ id: rentals.id, renterId: rentals.renterId })
    .from(rentals)
    .where(
      and(
        eq(rentals.listingId, rental.listingId),
        eq(rentals.status, "pending"),
      )
    );
  for (const other of otherPending) {
    await db
      .update(rentals)
      .set({ status: "declined", ownerNotes: "Another rental was approved", updatedAt: new Date() })
      .where(eq(rentals.id, other.id));

    await createNotification({
      userId: other.renterId,
      type: "rental_declined",
      title: "Rental declined",
      body: `Your rental request for "${listing?.title ?? "an item"}" was declined because another request was approved`,
      linkUrl: `/listing/${rental.listingId}`,
    });
  }

  revalidatePath(`/listing/${rental.listingId}`);
  revalidatePath("/dashboard");
  revalidatePath("/rentals");
}

export async function declineRental(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const rentalId = formData.get("rentalId") as string;
  const notes = (formData.get("notes") as string) || null;

  const rental = await db.query.rentals.findFirst({
    where: eq(rentals.id, rentalId),
  });
  if (!rental) throw new Error("Rental not found");
  if (rental.ownerId !== session.user.id) throw new Error("Unauthorized");
  if (rental.status !== "pending") throw new Error("Rental is not pending");

  await db
    .update(rentals)
    .set({ status: "declined", ownerNotes: notes, updatedAt: new Date() })
    .where(eq(rentals.id, rentalId));

  // Full refund (rental fee + deposit)
  if (rental.stripePaymentIntentId) {
    await stripe.refunds.create({ payment_intent: rental.stripePaymentIntentId });
  }

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, rental.listingId),
  });

  await createNotification({
    userId: rental.renterId,
    type: "rental_declined",
    title: "Rental declined",
    body: `Your rental request for "${listing?.title ?? "an item"}" has been declined`,
    linkUrl: `/listing/${rental.listingId}`,
  });

  revalidatePath(`/listing/${rental.listingId}`);
  revalidatePath("/dashboard");
  revalidatePath("/rentals");
}

export async function cancelRental(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const rentalId = formData.get("rentalId") as string;

  const rental = await db.query.rentals.findFirst({
    where: eq(rentals.id, rentalId),
  });
  if (!rental) throw new Error("Rental not found");
  if (rental.renterId !== session.user.id) throw new Error("Unauthorized");
  if (rental.status !== "pending") throw new Error("Can only cancel pending requests");

  await db
    .update(rentals)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(rentals.id, rentalId));

  // Full refund (rental fee + deposit)
  if (rental.stripePaymentIntentId) {
    await stripe.refunds.create({ payment_intent: rental.stripePaymentIntentId });
  }

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, rental.listingId),
  });

  await createNotification({
    userId: rental.ownerId,
    type: "rental_cancelled",
    title: "Rental cancelled",
    body: `${session.user.name} cancelled their rental request for "${listing?.title ?? "an item"}"`,
    linkUrl: `/listing/${rental.listingId}`,
  });

  revalidatePath(`/listing/${rental.listingId}`);
  revalidatePath("/dashboard");
  revalidatePath("/rentals");
}

export async function completeRental(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const rentalId = formData.get("rentalId") as string;

  const rental = await db.query.rentals.findFirst({
    where: eq(rentals.id, rentalId),
  });
  if (!rental) throw new Error("Rental not found");
  if (rental.ownerId !== session.user.id) throw new Error("Unauthorized");
  if (rental.status !== "active") throw new Error("Rental is not active");

  await db
    .update(rentals)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(rentals.id, rentalId));

  // Set listing back to active
  await db
    .update(listings)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(listings.id, rental.listingId));

  // Refund deposit only (rental fee stays with platform until transferred)
  if (rental.stripePaymentIntentId && rental.depositAmount && rental.depositAmount > 0) {
    await stripe.refunds.create({
      payment_intent: rental.stripePaymentIntentId,
      amount: Math.round(rental.depositAmount * 100),
    });
  }

  // Transfer funds to owner via Stripe Connect
  const owner = await db.query.users.findFirst({
    where: eq(users.id, rental.ownerId),
  });

  if (
    owner?.stripeConnectAccountId &&
    owner.stripeConnectOnboarded &&
    rental.stripePaymentIntentId &&
    rental.totalPrice
  ) {
    const { ownerPayout } = calculatePlatformSplit(
      rental.totalPrice,
      rental.depositAmount ?? 0
    );

    if (ownerPayout > 0) {
      try {
        // Get the charge ID from the PaymentIntent
        const pi = await stripe.paymentIntents.retrieve(
          rental.stripePaymentIntentId
        );
        const chargeId =
          typeof pi.latest_charge === "string"
            ? pi.latest_charge
            : pi.latest_charge?.id;

        if (chargeId) {
          const transfer = await stripe.transfers.create({
            amount: Math.round(ownerPayout * 100),
            currency: "usd",
            destination: owner.stripeConnectAccountId,
            source_transaction: chargeId,
            metadata: { rentalId },
          });

          await db
            .update(rentals)
            .set({ stripeTransferId: transfer.id })
            .where(eq(rentals.id, rentalId));
        }
      } catch (err) {
        // Transfer failed — rental still completes, flag for manual review
        console.error("Transfer to owner failed:", err);
      }
    }
  } else if (owner && !owner.stripeConnectAccountId) {
    // Owner hasn't set up payouts — notify them
    await createNotification({
      userId: rental.ownerId,
      type: "rental_completed",
      title: "Set up payouts to receive funds",
      body: "Your rental completed but you haven't set up payouts yet. Go to Settings to connect your bank account.",
      linkUrl: "/settings",
    });
  }

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, rental.listingId),
  });

  await createNotification({
    userId: rental.renterId,
    type: "rental_completed",
    title: "Rental completed",
    body: `Your rental of "${listing?.title ?? "an item"}" has been marked as completed`,
    linkUrl: `/listing/${rental.listingId}`,
  });

  revalidatePath(`/listing/${rental.listingId}`);
  revalidatePath("/dashboard");
  revalidatePath("/rentals");
}

export async function placeBid(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await requireVerifiedUser(session.user.id);

  const listingId = formData.get("listingId") as string;
  const amount = parsePositiveNumber(formData.get("amount"), "Bid amount", MAX_PRICE);
  const startDateStr = formData.get("startDate") as string;
  const endDateStr = formData.get("endDate") as string;
  const message = (formData.get("message") as string) || null;

  if (!listingId || !startDateStr || !endDateStr) {
    throw new Error("Please fill in all required fields");
  }

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
  });
  if (!listing) throw new Error("Listing not found");

  if (listing.userId === session.user.id) {
    throw new Error("You cannot bid on your own item");
  }

  if (listing.status !== "active") {
    throw new Error("This item is not available for rent");
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate < today) {
    throw new Error("Start date cannot be in the past");
  }
  if (endDate <= startDate) {
    throw new Error("End date must be after start date");
  }

  // Check for date conflicts with blocked dates and existing rentals
  const { blockedRanges: bidBlocked, bookedRanges: bidBooked } = await getUnavailableDateRanges(listingId);

  for (const b of bidBlocked) {
    if (rangesOverlap(startDate, endDate, new Date(b.start), new Date(b.end))) {
      throw new Error("Selected dates overlap with unavailable dates");
    }
  }

  for (const r of bidBooked) {
    if (rangesOverlap(startDate, endDate, new Date(r.start), new Date(r.end))) {
      throw new Error("Selected dates overlap with an existing rental");
    }
  }

  // Check for existing pending bid from this user on this listing
  const existingBid = await db.query.bids.findFirst({
    where: and(
      eq(bids.listingId, listingId),
      eq(bids.bidderId, session.user.id),
      eq(bids.status, "pending")
    ),
  });
  if (existingBid) {
    throw new Error("You already have a pending bid on this item. Withdraw it first to place a new one.");
  }

  await db.insert(bids).values({
    id: uuidv4(),
    listingId,
    bidderId: session.user.id,
    ownerId: listing.userId,
    amount,
    startDate,
    endDate,
    message,
  });

  await createNotification({
    userId: listing.userId,
    type: "bid_received",
    title: "New offer received",
    body: `${session.user.name} made a $${amount.toFixed(2)} offer on "${listing.title}"`,
    linkUrl: `/listing/${listingId}`,
  });

  revalidatePath(`/listing/${listingId}`);
  revalidatePath("/dashboard");
}

export async function acceptBid(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const bidId = formData.get("bidId") as string;

  const bid = await db.query.bids.findFirst({
    where: eq(bids.id, bidId),
  });
  if (!bid) throw new Error("Bid not found");
  if (bid.ownerId !== session.user.id) throw new Error("Unauthorized");
  if (bid.status !== "pending") throw new Error("Bid is no longer pending");

  // Accept this bid
  await db
    .update(bids)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(eq(bids.id, bidId));

  // Create a rental from the accepted bid
  await db.insert(rentals).values({
    id: uuidv4(),
    listingId: bid.listingId,
    renterId: bid.bidderId,
    ownerId: bid.ownerId,
    startDate: bid.startDate,
    endDate: bid.endDate,
    totalPrice: bid.amount,
    status: "active",
  });

  // Mark listing as rented
  await db
    .update(listings)
    .set({ status: "rented", updatedAt: new Date() })
    .where(eq(listings.id, bid.listingId));

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, bid.listingId),
  });

  await createNotification({
    userId: bid.bidderId,
    type: "bid_accepted",
    title: "Offer accepted",
    body: `Your $${bid.amount.toFixed(2)} offer on "${listing?.title ?? "an item"}" has been accepted`,
    linkUrl: `/listing/${bid.listingId}`,
  });

  // Decline all other pending bids for this listing
  const otherBids = await db
    .select({ id: bids.id, bidderId: bids.bidderId })
    .from(bids)
    .where(
      and(
        eq(bids.listingId, bid.listingId),
        eq(bids.status, "pending")
      )
    );
  for (const other of otherBids) {
    await db
      .update(bids)
      .set({ status: "declined", updatedAt: new Date() })
      .where(eq(bids.id, other.id));

    await createNotification({
      userId: other.bidderId,
      type: "bid_declined",
      title: "Offer declined",
      body: `Your offer on "${listing?.title ?? "an item"}" was declined because another offer was accepted`,
      linkUrl: `/listing/${bid.listingId}`,
    });
  }

  // Also decline any pending rental requests
  const pendingRentals = await db
    .select({ id: rentals.id, renterId: rentals.renterId })
    .from(rentals)
    .where(
      and(
        eq(rentals.listingId, bid.listingId),
        eq(rentals.status, "pending")
      )
    );
  for (const pr of pendingRentals) {
    await db
      .update(rentals)
      .set({ status: "declined", ownerNotes: "A bid was accepted", updatedAt: new Date() })
      .where(eq(rentals.id, pr.id));

    await createNotification({
      userId: pr.renterId,
      type: "rental_declined",
      title: "Rental declined",
      body: `Your rental request for "${listing?.title ?? "an item"}" was declined because an offer was accepted`,
      linkUrl: `/listing/${bid.listingId}`,
    });
  }

  revalidatePath(`/listing/${bid.listingId}`);
  revalidatePath("/dashboard");
  revalidatePath("/rentals");
}

export async function declineBid(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const bidId = formData.get("bidId") as string;

  const bid = await db.query.bids.findFirst({
    where: eq(bids.id, bidId),
  });
  if (!bid) throw new Error("Bid not found");
  if (bid.ownerId !== session.user.id) throw new Error("Unauthorized");
  if (bid.status !== "pending") throw new Error("Bid is no longer pending");

  await db
    .update(bids)
    .set({ status: "declined", updatedAt: new Date() })
    .where(eq(bids.id, bidId));

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, bid.listingId),
  });

  await createNotification({
    userId: bid.bidderId,
    type: "bid_declined",
    title: "Offer declined",
    body: `Your offer on "${listing?.title ?? "an item"}" has been declined`,
    linkUrl: `/listing/${bid.listingId}`,
  });

  revalidatePath(`/listing/${bid.listingId}`);
  revalidatePath("/dashboard");
}

export async function withdrawBid(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const bidId = formData.get("bidId") as string;

  const bid = await db.query.bids.findFirst({
    where: eq(bids.id, bidId),
  });
  if (!bid) throw new Error("Bid not found");
  if (bid.bidderId !== session.user.id) throw new Error("Unauthorized");
  if (bid.status !== "pending") throw new Error("Can only withdraw pending bids");

  await db
    .update(bids)
    .set({ status: "withdrawn", updatedAt: new Date() })
    .where(eq(bids.id, bidId));

  revalidatePath(`/listing/${bid.listingId}`);
  revalidatePath("/dashboard");
}

export async function updateNotificationPreferences(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const emailEnabled = formData.get("emailEnabled") === "on";
  const smsEnabled = formData.get("smsEnabled") === "on";
  const phoneNumber = (formData.get("phoneNumber") as string)?.trim() || null;

  if (smsEnabled && !phoneNumber) {
    throw new Error("Phone number is required when SMS notifications are enabled");
  }

  const existing = await db.query.notificationPreferences.findFirst({
    where: eq(notificationPreferences.userId, session.user.id),
  });

  if (existing) {
    await db
      .update(notificationPreferences)
      .set({
        emailEnabled,
        smsEnabled,
        phoneNumber,
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferences.userId, session.user.id));
  } else {
    await db.insert(notificationPreferences).values({
      id: uuidv4(),
      userId: session.user.id,
      emailEnabled,
      smsEnabled,
      phoneNumber,
    });
  }

  revalidatePath("/settings");
}

export async function requestRentalExtension(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const rentalId = formData.get("rentalId") as string;
  const newEndDateStr = formData.get("newEndDate") as string;
  const message = (formData.get("message") as string) || null;

  const rental = await db.query.rentals.findFirst({ where: eq(rentals.id, rentalId) });
  if (!rental) throw new Error("Rental not found");
  if (rental.renterId !== session.user.id) throw new Error("Unauthorized");
  if (rental.status !== "active") throw new Error("Can only extend active rentals");

  const newEndDate = new Date(newEndDateStr);
  if (newEndDate <= rental.endDate) throw new Error("New end date must be after current end date");

  // Check no pending extension already exists
  const pending = await db.query.rentalExtensions.findFirst({
    where: and(eq(rentalExtensions.rentalId, rentalId), eq(rentalExtensions.status, "pending")),
  });
  if (pending) throw new Error("You already have a pending extension request for this rental");

  // Check availability for extended period
  const { blockedRanges: blocked, bookedRanges: booked } = await getUnavailableDateRanges(rental.listingId);
  const extStart = new Date(rental.endDate.getTime() + 86400000); // day after current end
  for (const r of [...blocked, ...booked]) {
    if (rangesOverlap(extStart, newEndDate, new Date(r.start), new Date(r.end))) {
      throw new Error("The requested extension dates conflict with another booking");
    }
  }

  // Calculate additional price
  const listing = await db.query.listings.findFirst({ where: eq(listings.id, rental.listingId) });
  const extraDays = Math.ceil((newEndDate.getTime() - rental.endDate.getTime()) / (1000 * 60 * 60 * 24));
  let additionalPrice: number | null = null;
  if (listing?.pricePerDay) additionalPrice = listing.pricePerDay * extraDays;
  else if (listing?.pricePerWeek) additionalPrice = listing.pricePerWeek * Math.ceil(extraDays / 7);

  await db.insert(rentalExtensions).values({
    id: uuidv4(),
    rentalId,
    newEndDate,
    message,
    additionalPrice,
  });

  await createNotification({
    userId: rental.ownerId,
    type: "rental_requested",
    title: "Rental extension request",
    body: `${session.user.name} wants to extend their rental${additionalPrice ? ` (+$${additionalPrice.toFixed(2)})` : ""}`,
    linkUrl: `/listing/${rental.listingId}`,
  });

  revalidatePath(`/listing/${rental.listingId}`);
  revalidatePath("/dashboard");
}

export async function approveRentalExtension(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const extensionId = formData.get("extensionId") as string;

  const extension = await db.query.rentalExtensions.findFirst({
    where: eq(rentalExtensions.id, extensionId),
  });
  if (!extension) throw new Error("Extension not found");
  if (extension.status !== "pending") throw new Error("Extension is not pending");

  const rental = await db.query.rentals.findFirst({ where: eq(rentals.id, extension.rentalId) });
  if (!rental) throw new Error("Rental not found");
  if (rental.ownerId !== session.user.id) throw new Error("Unauthorized");

  await db.update(rentalExtensions)
    .set({ status: "approved" })
    .where(eq(rentalExtensions.id, extensionId));

  await db.update(rentals)
    .set({ endDate: extension.newEndDate, updatedAt: new Date() })
    .where(eq(rentals.id, extension.rentalId));

  const listing = await db.query.listings.findFirst({ where: eq(listings.id, rental.listingId) });

  await createNotification({
    userId: rental.renterId,
    type: "rental_approved",
    title: "Extension approved",
    body: `Your extension request for "${listing?.title ?? "an item"}" was approved`,
    linkUrl: `/listing/${rental.listingId}`,
  });

  revalidatePath(`/listing/${rental.listingId}`);
  revalidatePath("/dashboard");
}

export async function declineRentalExtension(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const extensionId = formData.get("extensionId") as string;

  const extension = await db.query.rentalExtensions.findFirst({
    where: eq(rentalExtensions.id, extensionId),
  });
  if (!extension) throw new Error("Extension not found");
  if (extension.status !== "pending") throw new Error("Extension is not pending");

  const rental = await db.query.rentals.findFirst({ where: eq(rentals.id, extension.rentalId) });
  if (!rental) throw new Error("Rental not found");
  if (rental.ownerId !== session.user.id) throw new Error("Unauthorized");

  await db.update(rentalExtensions)
    .set({ status: "declined" })
    .where(eq(rentalExtensions.id, extensionId));

  const listing = await db.query.listings.findFirst({ where: eq(listings.id, rental.listingId) });

  await createNotification({
    userId: rental.renterId,
    type: "rental_declined",
    title: "Extension declined",
    body: `Your extension request for "${listing?.title ?? "an item"}" was declined`,
    linkUrl: `/listing/${rental.listingId}`,
  });

  revalidatePath(`/listing/${rental.listingId}`);
  revalidatePath("/dashboard");
}

export async function blockDates(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const listingId = formData.get("listingId") as string;
  const startDateStr = formData.get("startDate") as string;
  const endDateStr = formData.get("endDate") as string;
  const reason = (formData.get("reason") as string)?.trim() || null;

  if (!listingId || !startDateStr || !endDateStr) {
    throw new Error("Please select start and end dates");
  }

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
  });
  if (!listing) throw new Error("Listing not found");
  if (listing.userId !== session.user.id) throw new Error("Unauthorized");

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate < today) {
    throw new Error("Start date cannot be in the past");
  }
  if (endDate < startDate) {
    throw new Error("End date must be on or after start date");
  }

  // Cannot block dates that have an active/pending rental
  const { bookedRanges } = await getUnavailableDateRanges(listingId);
  for (const r of bookedRanges) {
    if (rangesOverlap(startDate, endDate, new Date(r.start), new Date(r.end))) {
      throw new Error("Cannot block dates that overlap with an existing rental");
    }
  }

  await db.insert(blockedDates).values({
    id: uuidv4(),
    listingId,
    startDate,
    endDate,
    reason,
  });

  revalidatePath(`/listing/${listingId}`);
}

export async function unblockDates(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const blockedDateId = formData.get("blockedDateId") as string;
  if (!blockedDateId) throw new Error("Missing blocked date ID");

  const blocked = await db.query.blockedDates.findFirst({
    where: eq(blockedDates.id, blockedDateId),
  });
  if (!blocked) throw new Error("Not found");

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, blocked.listingId),
  });
  if (!listing || listing.userId !== session.user.id) throw new Error("Unauthorized");

  await db.delete(blockedDates).where(eq(blockedDates.id, blockedDateId));

  revalidatePath(`/listing/${listing.id}`);
}
