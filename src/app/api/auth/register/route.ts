import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { users, emailVerificationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeString, MAX_NAME, MAX_EMAIL } from "@/lib/validation";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { success } = rateLimit(`register:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 });
  if (!success) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 10_000) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  const { name: rawName, email: rawEmail, password } = await request.json();

  if (!rawName || !rawEmail || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required" },
      { status: 400 }
    );
  }

  const name = sanitizeString(rawName, "Name", MAX_NAME);
  const email = sanitizeString(rawEmail, "Email", MAX_EMAIL);

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }
  if (!/[a-zA-Z]/.test(password)) {
    return NextResponse.json(
      { error: "Password must contain at least one letter" },
      { status: 400 }
    );
  }
  if (!/[0-9]/.test(password)) {
    return NextResponse.json(
      { error: "Password must contain at least one number" },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Invalid email address" },
      { status: 400 }
    );
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    );
  }

  const passwordHash = await hash(password, 12);
  const id = uuidv4();

  await db.insert(users).values({
    id,
    name,
    email,
    passwordHash,
  });

  // Send verification email
  const rawToken = crypto.randomUUID();
  const hashedToken = await hash(rawToken, 12);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.insert(emailVerificationTokens).values({
    id: uuidv4(),
    userId: id,
    token: hashedToken,
    expiresAt,
  });

  const verifyUrl = `/verify-email?token=${rawToken}&email=${encodeURIComponent(email)}`;
  await sendEmail({
    to: email,
    subject: "Verify your email",
    body: `Hi ${name}, welcome to RentNeighbors! Please verify your email address to start posting listings and booking rentals.`,
    linkUrl: verifyUrl,
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
