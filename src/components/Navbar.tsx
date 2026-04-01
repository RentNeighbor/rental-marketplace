import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { conversations, messages, notifications } from "@/lib/db/schema";
import { eq, and, ne, isNull, or } from "drizzle-orm";
import NotificationBell from "@/components/NotificationBell";

export default async function Navbar() {
  const session = await auth();

  let unreadCount = 0;
  let unreadNotifCount = 0;
  if (session?.user?.id) {
    const userId = session.user.id;

    const unreadNotifs = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          isNull(notifications.readAt)
        )
      );
    unreadNotifCount = unreadNotifs.length;
    // Get all conversation IDs for this user
    const userConvs = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        or(
          eq(conversations.renterId, userId),
          eq(conversations.ownerId, userId)
        )
      );

    if (userConvs.length > 0) {
      for (const conv of userConvs) {
        const unread = await db
          .select({ id: messages.id })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, conv.id),
              ne(messages.senderId, userId),
              isNull(messages.readAt)
            )
          );
        unreadCount += unread.length;
      }
    }
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight text-green-700">
          RentNeighbor
        </Link>

        <div className="flex items-center gap-5">
          {session?.user ? (
            <>
              <Link
                href="/post"
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
              >
                Post a Listing
              </Link>
              <NotificationBell count={unreadNotifCount} />
              <Link
                href="/messages"
                className="relative text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Messages
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-3 bg-red-500 text-white text-[10px] font-medium min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <Link
                href={`/user/${session.user.id}`}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Profile
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                My Listings
              </Link>
              <Link
                href="/stats"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Stats
              </Link>
              <Link
                href="/settings"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Settings
              </Link>
              {isAdmin(session) && (
                <Link
                  href="/admin"
                  className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
                >
                  Admin
                </Link>
              )}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Sign Out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
