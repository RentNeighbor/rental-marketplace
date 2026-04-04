import { db } from "@/lib/db";
import { disputes, listings, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { resolveDispute, dismissDispute } from "@/lib/admin-actions";

const STATUS_TABS = ["all", "open", "resolved", "dismissed"] as const;

const statusColors: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-600",
};

export default async function AdminDisputes({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = STATUS_TABS.includes(params.status as typeof STATUS_TABS[number])
    ? params.status!
    : "all";

  const query = db
    .select({
      id: disputes.id,
      reason: disputes.reason,
      details: disputes.details,
      status: disputes.status,
      createdAt: disputes.createdAt,
      listingId: disputes.listingId,
      listingTitle: listings.title,
      filerName: users.name,
      filerEmail: users.email,
    })
    .from(disputes)
    .leftJoin(listings, eq(disputes.listingId, listings.id))
    .leftJoin(users, eq(disputes.filedBy, users.id))
    .orderBy(desc(disputes.createdAt));

  const allDisputes =
    statusFilter === "all"
      ? await query
      : await query.where(eq(disputes.status, statusFilter as "open" | "resolved" | "dismissed"));

  return (
    <div>
      <div className="flex gap-1 mb-6">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab}
            href={`/admin/disputes${tab === "all" ? "" : `?status=${tab}`}`}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              statusFilter === tab
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Link>
        ))}
      </div>

      {allDisputes.length === 0 ? (
        <p className="text-sm text-gray-400">No disputes found</p>
      ) : (
        <div className="space-y-3">
          {allDisputes.map((d) => (
            <div key={d.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <Link
                    href={`/listing/${d.listingId}`}
                    className="text-sm font-medium text-gray-900 hover:text-green-600"
                  >
                    {d.listingTitle ?? "Deleted listing"}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Filed by {d.filerName} · {d.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                    {d.reason.replace(/_/g, " ")}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColors[d.status]}`}>
                    {d.status}
                  </span>
                </div>
              </div>
              {d.details && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{d.details}</p>
              )}
              {d.status === "open" && (
                <div className="flex gap-1.5">
                  <form action={resolveDispute}>
                    <input type="hidden" name="disputeId" value={d.id} />
                    <button className="rounded-md bg-green-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-green-700">
                      Resolve
                    </button>
                  </form>
                  <form action={dismissDispute}>
                    <input type="hidden" name="disputeId" value={d.id} />
                    <button className="rounded-md border border-gray-300 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50">
                      Dismiss
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
