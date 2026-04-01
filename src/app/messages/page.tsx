import { db } from "@/lib/db";
import { conversations, messages, users, listings } from "@/lib/db/schema";
import { eq, desc, and, or, ne, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

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
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm">
                      {conv.otherUserName}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="bg-green-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    Re: {conv.listingTitle}
                  </p>
                  <p className="text-sm text-gray-600 mt-1.5 truncate">
                    {conv.lastMessageIsMe && (
                      <span className="text-gray-400">You: </span>
                    )}
                    {conv.lastMessageBody}
                  </p>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0">
                  {conv.lastMessageAt.toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
