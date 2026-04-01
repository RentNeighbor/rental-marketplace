import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { rentals, listings, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";
import { getUnavailableDateRanges, rangesOverlap } from "@/lib/availability";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return Response.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const meta = session.metadata ?? {};

    const listingId = meta.listingId;
    const renterId = meta.renterId;
    const ownerId = meta.ownerId;
    const startDate = new Date(meta.startDate);
    const endDate = new Date(meta.endDate);
    const totalPrice = meta.totalPrice ? Number(meta.totalPrice) : null;
    const depositAmount = meta.depositAmount ? Number(meta.depositAmount) : null;
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    if (!listingId || !renterId || !ownerId) {
      return Response.json({ error: "Missing metadata" }, { status: 400 });
    }

    // Validate numeric metadata
    if (totalPrice !== null && (!Number.isFinite(totalPrice) || totalPrice < 0)) {
      console.error("Webhook: invalid totalPrice in metadata");
      return Response.json({ error: "Invalid metadata" }, { status: 400 });
    }
    if (depositAmount !== null && (!Number.isFinite(depositAmount) || depositAmount < 0)) {
      console.error("Webhook: invalid depositAmount in metadata");
      return Response.json({ error: "Invalid metadata" }, { status: 400 });
    }

    // Re-verify metadata: confirm listing exists and ownerId matches
    const listing = await db.query.listings.findFirst({
      where: eq(listings.id, listingId),
    });
    if (!listing || listing.userId !== ownerId) {
      console.error(`Webhook: listing ${listingId} not found or ownerId mismatch`);
      return Response.json({ error: "Invalid metadata" }, { status: 400 });
    }

    const renter = await db.query.users.findFirst({
      where: eq(users.id, renterId),
    });
    if (!renter) {
      console.error(`Webhook: renter ${renterId} not found`);
      return Response.json({ error: "Invalid metadata" }, { status: 400 });
    }

    // Check for conflicts that may have arisen since checkout was initiated
    const { blockedRanges, bookedRanges } = await getUnavailableDateRanges(listingId);
    const hasConflict =
      blockedRanges.some((r) =>
        rangesOverlap(startDate, endDate, new Date(r.start), new Date(r.end))
      ) ||
      bookedRanges.some((r) =>
        rangesOverlap(startDate, endDate, new Date(r.start), new Date(r.end))
      );

    if (hasConflict && paymentIntentId) {
      // Refund the full amount — dates are no longer available
      await stripe.refunds.create({ payment_intent: paymentIntentId });
      return Response.json({ received: true, refunded: true });
    }

    await db.insert(rentals).values({
      id: uuidv4(),
      listingId,
      renterId,
      ownerId,
      startDate,
      endDate,
      totalPrice,
      stripePaymentIntentId: paymentIntentId,
      depositAmount,
      status: "pending",
    });

    await createNotification({
      userId: ownerId,
      type: "rental_requested",
      title: "New rental request (paid)",
      body: `${renter.name ?? "Someone"} paid and wants to rent "${listing.title ?? "your item"}"`,
      linkUrl: `/listing/${listingId}`,
    });

    revalidatePath(`/listing/${listingId}`);
    revalidatePath("/dashboard");
  }

  if (event.type === "identity.verification_session.verified") {
    const verificationSession = event.data.object;
    const userId = verificationSession.metadata?.userId;
    if (userId) {
      await db
        .update(users)
        .set({ stripeIdentityVerified: true })
        .where(eq(users.id, userId));
    }
  }

  if (event.type === "account.updated") {
    const account = event.data.object;
    const userId = account.metadata?.userId;
    if (userId && account.charges_enabled) {
      await db
        .update(users)
        .set({ stripeConnectOnboarded: true })
        .where(eq(users.id, userId));
      revalidatePath("/settings");
    }
  }

  return Response.json({ received: true });
}
