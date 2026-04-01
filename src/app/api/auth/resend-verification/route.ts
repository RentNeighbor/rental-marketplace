import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { users, emailVerificationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { sendEmail } from "@/lib/email";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.emailVerifiedAt) {
    return NextResponse.json({ success: true, alreadyVerified: true });
  }

  // Delete existing tokens
  await db
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, user.id));

  // Generate new token
  const rawToken = crypto.randomUUID();
  const hashedToken = await hash(rawToken, 12);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.insert(emailVerificationTokens).values({
    id: uuidv4(),
    userId: user.id,
    token: hashedToken,
    expiresAt,
  });

  const verifyUrl = `/verify-email?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
  await sendEmail({
    to: user.email,
    subject: "Verify your email",
    body: `Hi ${user.name}, please verify your email address to start posting listings and booking rentals.`,
    linkUrl: verifyUrl,
  });

  return NextResponse.json({ success: true });
}
