import { handlers } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

export const { GET } = handlers;

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { success } = rateLimit(`login:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!success) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  return handlers.POST(request);
}
