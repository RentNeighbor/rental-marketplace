import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { users, emailVerificationTokens } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { success } = rateLimit(`verify:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!success) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const { email, token } = await request.json();

  if (!email || !token) {
    return NextResponse.json(
      { error: "Email and token are required" },
      { status: 400 }
    );
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    return NextResponse.json(
      { error: "Invalid or expired verification link" },
      { status: 400 }
    );
  }

  if (user.emailVerifiedAt) {
    return NextResponse.json({ success: true, alreadyVerified: true });
  }

  // Find non-expired tokens for this user
  const storedTokens = await db.query.emailVerificationTokens.findMany({
    where: and(
      eq(emailVerificationTokens.userId, user.id),
      gt(emailVerificationTokens.expiresAt, new Date())
    ),
  });

  let validToken = false;
  for (const stored of storedTokens) {
    if (await compare(token, stored.token)) {
      validToken = true;
      break;
    }
  }

  if (!validToken) {
    return NextResponse.json(
      { error: "Invalid or expired verification link" },
      { status: 400 }
    );
  }

  // Mark email as verified
  await db
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(users.id, user.id));

  // Delete all verification tokens for this user
  await db
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, user.id));

  return NextResponse.json({ success: true });
}
