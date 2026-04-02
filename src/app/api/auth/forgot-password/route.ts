import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { success } = rateLimit(`forgot:${ip}`, { limit: 3, windowMs: 15 * 60 * 1000 });
  if (!success) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const { email } = await request.json();

  if (!email) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    );
  }

  // Always return success to avoid leaking whether email exists
  const successResponse = NextResponse.json({ success: true });

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) return successResponse;

  // Delete any existing tokens for this user
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, user.id));

  // Generate token, hash it for storage
  const rawToken = crypto.randomUUID();
  const hashedToken = await hash(rawToken, 12);

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(passwordResetTokens).values({
    id: uuidv4(),
    userId: user.id,
    token: hashedToken,
    expiresAt,
  });

  // Send reset email
  const resetUrl = `/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
  await sendEmail({
    to: email,
    subject: "Reset your password",
    body: `Hi ${user.name}, we received a request to reset your password. Click the button below to set a new one. This link expires in 1 hour.`,
    linkUrl: resetUrl,
  });

  return successResponse;
}
