import { pgTable, text, integer, real, serial, boolean, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  location: text("location"),
  stripeIdentityVerified: boolean("stripe_identity_verified")
    .notNull()
    .default(false),
  stripeConnectAccountId: text("stripe_connect_account_id"),
  stripeConnectOnboarded: boolean("stripe_connect_onboarded")
    .notNull()
    .default(false),
  emailVerifiedAt: timestamp("email_verified_at"),
  suspendedAt: timestamp("suspended_at"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const listings = pgTable("listings", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  pricePerDay: real("price_per_day"),
  pricePerWeek: real("price_per_week"),
  securityDeposit: real("security_deposit"),
  location: text("location").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  categoryId: integer("category_id").references(() => categories.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  imageUrls: text("image_urls"), // JSON array of URLs stored as text
  contactEmail: text("contact_email").notNull(),
  condition: text("condition", {
    enum: ["new", "like_new", "excellent", "good", "fair", "well_worn"],
  }),
  status: text("status", { enum: ["active", "paused", "rented", "removed"] })
    .notNull()
    .default("active"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id),
  reportedBy: text("reported_by")
    .notNull()
    .references(() => users.id),
  reason: text("reason", {
    enum: [
      "spam",
      "prohibited_item",
      "misleading",
      "scam",
      "duplicate",
      "other",
    ],
  }).notNull(),
  details: text("details"),
  status: text("status", { enum: ["pending", "reviewed", "dismissed"] })
    .notNull()
    .default("pending"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const disputes = pgTable("disputes", {
  id: text("id").primaryKey(),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id),
  filedBy: text("filed_by")
    .notNull()
    .references(() => users.id),
  reason: text("reason", {
    enum: [
      "deposit_not_returned",
      "false_damage_claim",
      "item_not_as_described",
      "other",
    ],
  }).notNull(),
  details: text("details"),
  status: text("status", { enum: ["open", "resolved", "dismissed"] })
    .notNull()
    .default("open"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id),
  reviewerId: text("reviewer_id")
    .notNull()
    .references(() => users.id),
  revieweeId: text("reviewee_id")
    .notNull()
    .references(() => users.id),
  role: text("role", { enum: ["renter", "owner"] }).notNull(),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const rentals = pgTable("rentals", {
  id: text("id").primaryKey(),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id),
  renterId: text("renter_id")
    .notNull()
    .references(() => users.id),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalPrice: real("total_price"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeTransferId: text("stripe_transfer_id"),
  depositAmount: real("deposit_amount"),
  status: text("status", {
    enum: ["pending", "active", "completed", "declined", "cancelled"],
  })
    .notNull()
    .default("pending"),
  ownerNotes: text("owner_notes"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id),
  renterId: text("renter_id")
    .notNull()
    .references(() => users.id),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id),
  senderId: text("sender_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const bids = pgTable("bids", {
  id: text("id").primaryKey(),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id),
  bidderId: text("bidder_id")
    .notNull()
    .references(() => users.id),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  amount: real("amount").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  message: text("message"),
  status: text("status", {
    enum: ["pending", "accepted", "declined", "withdrawn", "expired"],
  })
    .notNull()
    .default("pending"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  type: text("type", {
    enum: [
      "rental_requested",
      "rental_approved",
      "rental_declined",
      "rental_cancelled",
      "rental_completed",
      "bid_received",
      "bid_accepted",
      "bid_declined",
      "new_message",
      "new_review",
      "listing_reported",
      "dispute_filed",
    ],
  }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  linkUrl: text("link_url"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  emailEnabled: boolean("email_enabled")
    .notNull()
    .default(false),
  smsEnabled: boolean("sms_enabled")
    .notNull()
    .default(false),
  phoneNumber: text("phone_number"),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const blockedDates = pgTable("blocked_dates", {
  id: text("id").primaryKey(),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const rentalExtensions = pgTable("rental_extensions", {
  id: text("id").primaryKey(),
  rentalId: text("rental_id")
    .notNull()
    .references(() => rentals.id),
  newEndDate: timestamp("new_end_date").notNull(),
  message: text("message"),
  status: text("status", { enum: ["pending", "approved", "declined"] })
    .notNull()
    .default("pending"),
  additionalPrice: real("additional_price"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const rentalPhotos = pgTable("rental_photos", {
  id: text("id").primaryKey(),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id),
  uploadedBy: text("uploaded_by")
    .notNull()
    .references(() => users.id),
  type: text("type", { enum: ["check_in", "check_out"] }).notNull(),
  photoUrl: text("photo_url").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});
