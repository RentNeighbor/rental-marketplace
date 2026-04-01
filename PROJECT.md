# RentNeighbor

> Peer-to-peer rental marketplace for neighbors. Rent anything from anyone nearby.

## Vision

RentNeighbor is a hyperlocal rental marketplace built around physical, in-person exchanges. The core bet: most people own things they rarely use, and their neighbors would pay to borrow them. Think Craigslist meets Turo, but for everything — tools, camping gear, party supplies, electronics, sporting equipment.

**Target market:** Neighborhoods and small towns. Not a shipping marketplace — renters and owners meet face-to-face. The proximity constraint builds trust and keeps logistics simple.

**Revenue model:** 10% platform fee on every transaction. Future revenue from promoted/featured listings where owners pay for visibility in search results.

**Stage:** Side project, building toward a real launch.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router, Server Components, Server Actions) |
| Database | PostgreSQL (Neon) via Drizzle ORM |
| Search | PostgreSQL tsvector/tsquery (weighted full-text search) |
| Auth | NextAuth.js (email/password, JWT sessions) |
| Payments | Stripe (Checkout, Connect, Identity) |
| Email | Resend |
| Geocoding | OpenStreetMap Nominatim |
| Styling | Tailwind CSS |

---

## What's Built

### Core Marketplace
- **Listing CRUD** — Create, edit, delete listings with multi-image upload (drag-drop, 5 images max), daily/weekly pricing, security deposit, condition rating, category tagging
- **Search & discovery** — Full-text search (FTS5 with BM25 weighting: title x10, location x5, description x1), AND/OR fallback, prefix matching. Filter by category, condition, price range, location radius (Haversine distance). Sort by relevance, newest, price, distance
- **Pricing suggestions** — Engine that suggests pricing based on similar listings weighted by condition and proximity

### Rental Lifecycle
- **Booking flow** — Date picker with price preview, unavailable date checking, Stripe Checkout redirect, payment success page
- **Rental states** — pending → active → completed (plus declined, cancelled paths)
- **Owner actions** — Approve, decline, complete rentals from dashboard
- **Renter actions** — Request, cancel rentals
- **Rental extensions** — Renter requests extended dates, owner approves/declines with recalculated pricing

### Bidding System
- **Custom offers** — Renters propose alternative dates and amounts
- **Owner response** — Accept (triggers checkout) or decline bids
- **Renter control** — Withdraw pending bids

### Payments (Stripe)
- **Checkout** — Stripe-hosted checkout with rental fee + security deposit
- **Owner payouts** — Stripe Connect Express accounts, 90/10 split (owner/platform)
- **Identity verification** — Stripe Identity document verification required before booking
- **Refunds** — Automatic refunds on decline, cancel, and date conflicts
- **Webhook handling** — checkout.session.completed, identity.verification_session.verified, account.updated

### Messaging
- **Conversations** — Per-listing threads between renter and owner
- **Read tracking** — Messages marked as read on view
- **Message owner button** — Quick contact from listing page

### Trust & Safety
- **Reviews & ratings** — 1-5 stars with comments, role-based (as renter / as owner)
- **Identity verification** — Stripe Identity document check before first booking
- **Photo documentation** — Check-in and check-out photos with notes for dispute evidence
- **Report system** — Flag listings as spam, prohibited, misleading, scam, duplicate
- **Dispute resolution** — File disputes for deposit issues, false damage claims, item discrepancies

### Availability Management
- **Date blocking** — Owners block date ranges with optional reasons
- **Calendar view** — Visual calendar showing available, blocked, and booked dates
- **Conflict detection** — Automatic refund if dates become unavailable between payment and processing

### Notifications
- **In-app** — 12 notification types with unread count bell, mark-as-read
- **Email** — Transactional emails via Resend with branded template and CTA
- **SMS** — Stub ready for Twilio integration
- **Preferences** — Per-user email/SMS toggles in settings

### User Profiles & Analytics
- **Public profiles** — Listings, reviews, average rating, dispute/report history
- **Owner analytics** — Total revenue, pending revenue, earnings/day, average rental duration, most popular listing
- **Renter analytics** — Total spending, rental count, average cost/day
- **Rating distribution** — Star breakdown for both roles

### Admin Dashboard
- **Overview** — KPI cards (total users, active listings, pending reports, open disputes, total revenue), recent pending reports and open disputes with quick actions
- **Reports management** — Filter by status (pending/reviewed/dismissed), review reports, dismiss reports, review & remove listing in one action
- **Disputes management** — Filter by status (open/resolved/dismissed), resolve or dismiss disputes with notifications to both parties
- **User management** — Search by name/email, view listing/rental counts, suspend/unsuspend users (suspended users blocked from login)
- **Listing management** — Search by title/owner, filter by status, admin removal of policy-violating listings
- **Auth** — Env-based admin email list (`ADMIN_EMAILS`), JWT middleware protecting all `/admin` routes

### Auth & Account Security
- **Password reset flow** — Forgot password email with hashed token (bcrypt, 1-hour expiry), reset page with validation, automatic token cleanup
- **Password UX** — Show/hide toggle on all password fields, confirm password on registration and reset, client-side validation (min 8 chars, letter + number)
- **Forgot password link** — Login page links to forgot-password flow
- **Email verification** — Verification email sent on registration (24-hour token expiry), yellow banner prompts unverified users, resend option, posting/booking/bidding gated behind verification

### Legal & Support
- **FAQ page** — Categorized FAQ covering getting started, renters, owners, payments, and trust & safety
- **Terms of Service & Privacy Policy** — Full legal pages covering account registration, payments, prohibited conduct, disputes, liability, data collection, and user rights
- **Footer links** — FAQ and Terms & Privacy linked in site-wide footer

### Listing Status
- **active** — Available for rent
- **paused** — Temporarily hidden by owner
- **rented** — Currently rented out
- **removed** — Removed by admin for policy violations

---

## Not Yet Built

- [ ] Wishlists / saved listings
- [ ] Repeat booking ("rent again" from history)
- [ ] Promoted / featured listings (paid boost)
- [ ] Insurance / damage protection add-on
- [ ] Pricing tiers (weekend vs weekday, monthly discounts)
- [x] Admin dashboard (manage reports, disputes, platform metrics)
- [ ] Social proof ("rented X times", view counts)
- [ ] Verification badges (visible trust indicators)
- [ ] Mobile push notifications
- [x] Testing (Vitest — validation, pricing, FTS tokenization)
- [x] Password reset flow + password UX improvements

---

## Long-Term Roadmap: Mobile App

**Goal:** Native iOS/Android app on the App Store and Google Play, synced with the website.

**Approach:** React Native (Expo) as a separate client, sharing the same Next.js backend. No duplicated business logic — both the website and app call the same API.

**Phases:**

1. **Build REST API layer** — Add API routes to the Next.js backend for every action currently handled by server actions (listings CRUD, booking, messaging, bids, reviews, etc.). Token-based auth for mobile clients. This also benefits the website by enabling future third-party integrations.

2. **Build React Native app with Expo** — Separate repo, calls the shared API. Reuses React knowledge. Covers: browse/search, listing detail, booking flow, messaging, notifications (push via Expo), owner dashboard.

3. **App Store deployment** — Expo EAS Build for iOS/Android submission. Requires Apple Developer ($99/yr) and Google Play ($25 one-time) accounts.

**When to start:** After the website is launched, validated with real users, and stable. Building two clients simultaneously as a side project will slow both down. User feedback from the web launch will inform what the mobile app should prioritize.

---

## Database Schema

**Tables:** users, listings, categories, rentals, conversations, messages, bids, reviews, blockedDates, rentalExtensions, rentalPhotos, reports, disputes, notifications, notificationPreferences

---

*Last updated: 2026-04-01*
