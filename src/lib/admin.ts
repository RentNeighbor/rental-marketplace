import { auth } from "@/lib/auth";

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
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
