import { db } from "@/lib/db";
import { conversations, messages, users, listings } from "@/lib/db/schema";
import { eq, and, ne, isNull, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import MessageComposer from "@/components/MessageComposer";
import { sendMessage } from "@/lib/actions";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });

  if (!conversation) notFound();

  // Verify participant
  if (conversation.renterId !== userId && conversation.ownerId !== userId) {
    notFound();
  }

  const otherUserId =
    conversation.renterId === userId
      ? conversation.ownerId
      : conversation.renterId;

  const [otherUser, listing] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, otherUserId) }),
    db.query.listings.findFirst({
      where: eq(listings.id, conversation.listingId),
    }),
  ]);

  // Mark unread messages from the other user as read
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        ne(messages.senderId, userId),
        isNull(messages.readAt)
      )
    );

  // Fetch all messages
  const allMessages = await db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      body: messages.body,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  // Get sender names
  const senderIds = [...new Set(allMessages.map((m) => m.senderId))];
  const senderUsers = await Promise.all(
    senderIds.map((sid) =>
      db.query.users.findFirst({ where: eq(users.id, sid) })
    )
  );
  const senderMap = Object.fromEntries(
    senderUsers.filter(Boolean).map((u) => [u!.id, u!.name])
  );

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/messages"
          className="text-sm text-green-700 hover:underline"
        >
          &larr; Messages
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Conversation header */}
        <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 text-sm">
                {otherUser?.name || "Unknown"}
              </p>
              {listing && (
                <Link
                  href={`/listing/${listing.id}`}
                  className="text-xs text-green-700 hover:underline"
                >
                  Re: {listing.title}
                </Link>
              )}
            </div>
            <span className="text-[11px] text-gray-400">
              {conversation.renterId === userId ? "You are the renter" : "You are the owner"}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="px-5 py-4 space-y-4 max-h-[500px] overflow-y-auto">
          {allMessages.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No messages yet
            </p>
          ) : (
            allMessages.map((msg) => {
              const isMe = msg.senderId === userId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-xl px-3.5 py-2.5 ${
                      isMe
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {!isMe && (
                      <p
                        className={`text-[11px] font-medium mb-0.5 ${
                          isMe ? "text-green-100" : "text-gray-500"
                        }`}
                      >
                        {senderMap[msg.senderId] || "Unknown"}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        isMe ? "text-green-200" : "text-gray-400"
                      }`}
                    >
                      {msg.createdAt.toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Composer */}
        <div className="px-5 pb-4">
          <MessageComposer
            conversationId={conversationId}
            submitAction={sendMessage}
          />
        </div>
      </div>
    </div>
  );
}
