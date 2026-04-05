import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { rateLimit, getIp } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const { success } = rateLimit(`notif:${getIp(request)}`, { limit: 30, windowMs: 60 * 1000 });
  if (!success) {
    return Response.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || "20"), 50);

  const items = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return Response.json({ notifications: items });
}
