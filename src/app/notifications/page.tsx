import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";

const typeLabels: Record<string, { label: string; color: string }> = {
  rental_requested: { label: "Rental Request", color: "bg-blue-100 text-blue-800" },
  rental_approved: { label: "Approved", color: "bg-green-100 text-green-800" },
  rental_declined: { label: "Declined", color: "bg-red-100 text-red-800" },
  rental_cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-600" },
  rental_completed: { label: "Completed", color: "bg-blue-100 text-blue-800" },
  bid_received: { label: "New Offer", color: "bg-amber-100 text-amber-800" },
  bid_accepted: { label: "Offer Accepted", color: "bg-green-100 text-green-800" },
  bid_declined: { label: "Offer Declined", color: "bg-red-100 text-red-800" },
  new_message: { label: "Message", color: "bg-green-100 text-green-800" },
  new_review: { label: "Review", color: "bg-yellow-100 text-yellow-800" },
  listing_reported: { label: "Report", color: "bg-red-100 text-red-800" },
  dispute_filed: { label: "Dispute", color: "bg-red-100 text-red-800" },
};

function formatDate(date: Date) {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const allNotifications = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(100);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <Link
          href="/settings"
          className="text-sm text-green-600 hover:text-green-700 font-medium"
        >
          Notification Settings
        </Link>
      </div>

      {allNotifications.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">
          No notifications yet
        </div>
      ) : (
        <div className="space-y-2">
          {allNotifications.map((notif) => {
            const typeInfo = typeLabels[notif.type] || {
              label: notif.type,
              color: "bg-gray-100 text-gray-600",
            };
            return (
              <Link
                key={notif.id}
                href={notif.linkUrl || "#"}
                className={`block bg-white border rounded-xl p-4 hover:bg-gray-50 transition-colors ${
                  !notif.readAt
                    ? "border-green-200 bg-green-50/30"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}
                      >
                        {typeInfo.label}
                      </span>
                      {!notif.readAt && (
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {notif.title}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">{notif.body}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(notif.createdAt)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
