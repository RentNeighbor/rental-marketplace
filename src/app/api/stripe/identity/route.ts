import { stripe } from "@/lib/stripe";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { success } = rateLimit(`stripe-identity:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 });
  if (!success) {
    return Response.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const protocol = headersList.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;

  const verificationSession = await stripe.identity.verificationSessions.create({
    type: "document",
    metadata: { userId: session.user.id },
    return_url: `${baseUrl}/settings?identity=pending`,
  });

  return Response.json({ url: verificationSession.url });
}
