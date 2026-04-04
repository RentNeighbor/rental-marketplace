import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { conversations, messages, notifications } from "@/lib/db/schema";
import { eq, and, ne, isNull, or } from "drizzle-orm";
import NotificationBell from "@/components/NotificationBell";
import MobileMenu from "@/components/MobileMenu";

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

  const admin = session ? isAdmin(session) : false;

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg md:text-xl font-bold tracking-tight text-green-700">
          <img src="/logo.svg" alt="" className="h-7 w-7 md:h-8 md:w-8" />
          RentNeighbors
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-5">
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
                href="/rental-history"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Rentals
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
              {admin && (
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

        {/* Mobile nav */}
        <div className="flex md:hidden items-center gap-3">
          {session?.user ? (
            <>
              <NotificationBell count={unreadNotifCount} />
              <Link href="/messages" className="relative p-1">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-medium min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-0.5">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <MobileMenu
                userId={session.user.id!}
                isAdmin={admin}
                signOutAction={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              />
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-gray-600">Log In</Link>
              <Link href="/register" className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
