import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const email = req.auth?.user?.email?.toLowerCase();
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!email) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!adminEmails.includes(email)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
