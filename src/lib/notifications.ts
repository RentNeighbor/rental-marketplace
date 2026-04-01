import { db } from "@/lib/db";
import { notifications, notificationPreferences, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { sendEmail } from "@/lib/email";

type NotificationType =
  | "rental_requested"
  | "rental_approved"
  | "rental_declined"
  | "rental_cancelled"
  | "rental_completed"
  | "bid_received"
  | "bid_accepted"
  | "bid_declined"
  | "new_message"
  | "new_review"
  | "listing_reported"
  | "dispute_filed";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string;
}

async function sendEmailNotification(
  email: string,
  title: string,
  body: string,
  linkUrl?: string
) {
  await sendEmail({ to: email, subject: title, body, linkUrl });
}

async function sendSmsNotification(phone: string, body: string) {
  // TODO: Replace with real SMS provider (e.g., Twilio)
  console.log(`[SMS] To: ${phone} | Body: ${body}`);
}

export async function createNotification({
  userId,
  type,
  title,
  body,
  linkUrl,
}: CreateNotificationParams) {
  // Always create in-app notification
  await db.insert(notifications).values({
    id: uuidv4(),
    userId,
    type,
    title,
    body,
    linkUrl: linkUrl ?? null,
  });

  // Check user preferences for email/SMS
  const prefs = await db.query.notificationPreferences.findFirst({
    where: eq(notificationPreferences.userId, userId),
  });

  if (prefs?.emailEnabled || prefs?.smsEnabled) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (user && prefs.emailEnabled) {
      await sendEmailNotification(user.email, title, body, linkUrl);
    }

    if (prefs.smsEnabled && prefs.phoneNumber) {
      await sendSmsNotification(prefs.phoneNumber, `${title}: ${body}`);
    }
  }
}
