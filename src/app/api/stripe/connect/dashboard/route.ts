import { stripe } from "@/lib/stripe";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user?.stripeConnectAccountId) {
    return Response.json({ error: "No connected account" }, { status: 400 });
  }

  const loginLink = await stripe.accounts.createLoginLink(
    user.stripeConnectAccountId
  );

  return Response.json({ url: loginLink.url });
}
