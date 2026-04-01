import { stripe } from "@/lib/stripe";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  let connectAccountId = user.stripeConnectAccountId;

  // Create a new Express account if one doesn't exist
  if (!connectAccountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      metadata: { userId: user.id },
      capabilities: {
        transfers: { requested: true },
      },
    });
    connectAccountId = account.id;

    await db
      .update(users)
      .set({ stripeConnectAccountId: connectAccountId })
      .where(eq(users.id, session.user.id));
  }

  // Create an onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: connectAccountId,
    refresh_url: `${baseUrl}/settings?connect=refresh`,
    return_url: `${baseUrl}/settings?connect=return`,
    type: "account_onboarding",
  });

  return Response.json({ url: accountLink.url });
}
