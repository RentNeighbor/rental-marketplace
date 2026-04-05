import { auth } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => Boolean(e) && EMAIL_RE.test(e));
}

export function isAdmin(session: { user?: { email?: string | null } } | null): boolean {
  const email = session?.user?.email?.toLowerCase();
  if (!email) return false;
  return getAdminEmails().includes(email);
}

export async function requireAdmin() {
  const session = await auth();
  if (!isAdmin(session)) {
    throw new Error("Unauthorized: admin access required");
  }
  return session!;
}
