import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { rateLimit, getIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const { success } = rateLimit(`notif-read:${getIp(request)}`, { limit: 30, windowMs: 60 * 1000 });
  if (!success) {
    return Response.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 5_000) {
    return Response.json({ error: "Request too large" }, { status: 413 });
  }

  const body = await request.json();

  if (body.all) {
    // Mark all unread notifications as read
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, session.user.id),
          isNull(notifications.readAt)
        )
      );
  } else if (body.notificationId) {
    // Mark single notification as read
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, body.notificationId),
          eq(notifications.userId, session.user.id)
        )
      );
  } else {
    return Response.json({ error: "Provide notificationId or all: true" }, { status: 400 });
  }

  return Response.json({ ok: true });
}
