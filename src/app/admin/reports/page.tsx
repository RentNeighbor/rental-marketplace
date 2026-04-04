import { db } from "@/lib/db";
import { reports, listings, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { reviewReport, dismissReport } from "@/lib/admin-actions";

const STATUS_TABS = ["all", "pending", "reviewed", "dismissed"] as const;

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  reviewed: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-600",
};

export default async function AdminReports({
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
      id: reports.id,
      reason: reports.reason,
      details: reports.details,
      status: reports.status,
      createdAt: reports.createdAt,
      listingId: reports.listingId,
      listingTitle: listings.title,
      reporterName: users.name,
      reporterEmail: users.email,
    })
    .from(reports)
    .leftJoin(listings, eq(reports.listingId, listings.id))
    .leftJoin(users, eq(reports.reportedBy, users.id))
    .orderBy(desc(reports.createdAt));

  const allReports =
    statusFilter === "all"
      ? await query
      : await query.where(eq(reports.status, statusFilter as "pending" | "reviewed" | "dismissed"));

  return (
    <div>
      <div className="flex gap-1 mb-6">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab}
            href={`/admin/reports${tab === "all" ? "" : `?status=${tab}`}`}
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

      {allReports.length === 0 ? (
        <p className="text-sm text-gray-400">No reports found</p>
      ) : (
        <div className="space-y-3">
          {allReports.map((r) => (
            <div key={r.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <Link
                    href={`/listing/${r.listingId}`}
                    className="text-sm font-medium text-gray-900 hover:text-green-600"
                  >
                    {r.listingTitle ?? "Deleted listing"}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Reported by {r.reporterName} · {r.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                    {r.reason.replace(/_/g, " ")}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColors[r.status]}`}>
                    {r.status}
                  </span>
                </div>
              </div>
              {r.details && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{r.details}</p>
              )}
              {r.status === "pending" && (
                <div className="flex flex-wrap gap-1.5">
                  <form action={reviewReport}>
                    <input type="hidden" name="reportId" value={r.id} />
                    <button className="rounded-md bg-green-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-green-700">
                      Review
                    </button>
                  </form>
                  <form action={reviewReport}>
                    <input type="hidden" name="reportId" value={r.id} />
                    <input type="hidden" name="removeListing" value="true" />
                    <button className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-red-700">
                      Review & Remove Listing
                    </button>
                  </form>
                  <form action={dismissReport}>
                    <input type="hidden" name="reportId" value={r.id} />
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
