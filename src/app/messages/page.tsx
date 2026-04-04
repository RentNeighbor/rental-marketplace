import { db } from "@/lib/db";
import { conversations, messages, users, listings } from "@/lib/db/schema";
import { eq, desc, and, or, ne, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { safeParseImageUrls } from "@/lib/utils";

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Get all conversations for this user
  const userConversations = await db
    .select()
    .from(conversations)
    .where(
      or(
        eq(conversations.renterId, userId),
        eq(conversations.ownerId, userId)
      )
    )
    .orderBy(desc(conversations.updatedAt));

  // Build conversation previews
  const previews = await Promise.all(
    userConversations.map(async (conv) => {
      const otherUserId =
        conv.renterId === userId ? conv.ownerId : conv.renterId;

      const [otherUser, listing, lastMessage] = await Promise.all([
        db.query.users.findFirst({ where: eq(users.id, otherUserId) }),
        db.query.listings.findFirst({ where: eq(listings.id, conv.listingId) }),
        db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(desc(messages.createdAt))
          .limit(1)
          .then((rows) => rows[0] || null),
      ]);

      // Count unread messages (sent by other user, not yet read)
      const unreadMessages = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conv.id),
            ne(messages.senderId, userId),
            isNull(messages.readAt)
          )
        );

      return {
        id: conv.id,
        otherUserName: otherUser?.name || "Unknown",
        listingTitle: listing?.title || "Deleted listing",
        listingImage: listing ? safeParseImageUrls(listing.imageUrls)[0] || null : null,
        listingId: conv.listingId,
        lastMessageBody: lastMessage?.body || "",
        lastMessageAt: lastMessage?.createdAt || conv.createdAt,
        lastMessageIsMe: lastMessage?.senderId === userId,
        unreadCount: unreadMessages.length,
      };
    })
  );

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Messages</h1>

      {previews.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl text-gray-400">
          <p className="text-lg">No messages yet</p>
          <p className="text-sm mt-1">
            Start a conversation by messaging an item owner
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {previews.map((conv) => (
            <Link
              key={conv.id}
              href={`/messages/${conv.id}`}
              className={`block rounded-xl border p-4 transition-colors hover:border-green-300 ${
                conv.unreadCount > 0
                  ? "bg-green-50 border-green-200"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3">
                {conv.listingImage ? (
                  <img
                    src={conv.listingImage}
                    alt={conv.listingTitle}
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-gray-900 text-sm">
                        {conv.otherUserName}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="bg-green-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400 shrink-0">
                      {conv.lastMessageAt.toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    <Link
                      href={`/listing/${conv.listingId}`}
                      className="text-green-700 hover:underline"
                    >
                      {conv.listingTitle}
                    </Link>
                  </p>
                  <p className="text-sm text-gray-600 mt-1.5 truncate">
                    {conv.lastMessageIsMe && (
                      <span className="text-gray-400">You: </span>
                    )}
                    {conv.lastMessageBody}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
