import { NextResponse } from "next/server";
import { hash, compare } from "bcryptjs";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

export async function POST(request: Request) {
  const { email, token, password } = await request.json();

  if (!email || !token || !password) {
    return NextResponse.json(
      { error: "Email, token, and password are required" },
      { status: 400 }
    );
  }

  // Validate password: min 8 chars, at least one letter and one number
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters and contain both letters and numbers" },
      { status: 400 }
    );
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    return NextResponse.json(
      { error: "Invalid or expired reset link" },
      { status: 400 }
    );
  }

  // Find non-expired token for this user
  const storedTokens = await db.query.passwordResetTokens.findMany({
    where: and(
      eq(passwordResetTokens.userId, user.id),
      gt(passwordResetTokens.expiresAt, new Date())
    ),
  });

  // Compare raw token against each stored hash
  let validToken = false;
  for (const stored of storedTokens) {
    if (await compare(token, stored.token)) {
      validToken = true;
      break;
    }
  }

  if (!validToken) {
    return NextResponse.json(
      { error: "Invalid or expired reset link" },
      { status: 400 }
    );
  }

  // Hash new password and update user
  const passwordHash = await hash(password, 12);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

  // Delete all tokens for this user
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, user.id));

  return NextResponse.json({ success: true });
}
