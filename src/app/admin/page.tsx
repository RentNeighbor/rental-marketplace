import { db } from "@/lib/db";
import { users, listings, reports, disputes, rentals } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import Link from "next/link";
import { reviewReport, dismissReport, resolveDispute, dismissDispute } from "@/lib/admin-actions";

export default async function AdminOverview() {
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [activeListings] = await db
    .select({ count: sql<number>`count(*)` })
    .from(listings)
    .where(eq(listings.status, "active"));
  const [pendingReports] = await db
    .select({ count: sql<number>`count(*)` })
    .from(reports)
    .where(eq(reports.status, "pending"));
  const [openDisputes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(disputes)
    .where(eq(disputes.status, "open"));
  const [revenue] = await db
    .select({ total: sql<number>`coalesce(sum(${rentals.totalPrice}), 0)` })
    .from(rentals)
    .where(eq(rentals.status, "completed"));

  const recentReports = await db
    .select({
      id: reports.id,
      reason: reports.reason,
      status: reports.status,
      createdAt: reports.createdAt,
      listingId: reports.listingId,
      listingTitle: listings.title,
      reporterName: users.name,
    })
    .from(reports)
    .leftJoin(listings, eq(reports.listingId, listings.id))
    .leftJoin(users, eq(reports.reportedBy, users.id))
    .where(eq(reports.status, "pending"))
    .orderBy(desc(reports.createdAt))
    .limit(5);

  const recentDisputes = await db
    .select({
      id: disputes.id,
      reason: disputes.reason,
      status: disputes.status,
      createdAt: disputes.createdAt,
      listingId: disputes.listingId,
      listingTitle: listings.title,
      filerName: users.name,
    })
    .from(disputes)
    .leftJoin(listings, eq(disputes.listingId, listings.id))
    .leftJoin(users, eq(disputes.filedBy, users.id))
    .where(eq(disputes.status, "open"))
    .orderBy(desc(disputes.createdAt))
    .limit(5);

  const kpis = [
    { label: "Total Users", value: userCount.count },
    { label: "Active Listings", value: activeListings.count },
    { label: "Pending Reports", value: pendingReports.count, alert: pendingReports.count > 0 },
    { label: "Open Disputes", value: openDisputes.count, alert: openDisputes.count > 0 },
    { label: "Total Revenue", value: `$${revenue.total.toFixed(2)}` },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400">{kpi.label}</p>
            <p className={`text-xl font-bold ${kpi.alert ? "text-red-600" : "text-gray-900"}`}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Pending Reports */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Pending Reports</h2>
            <Link href="/admin/reports" className="text-xs text-green-600 hover:text-green-700">
              View all
            </Link>
          </div>
          {recentReports.length === 0 ? (
            <p className="text-sm text-gray-400">No pending reports</p>
          ) : (
            <div className="space-y-2">
              {recentReports.map((r) => (
                <div key={r.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Link
                      href={`/listing/${r.listingId}`}
                      className="text-sm font-medium text-gray-900 hover:text-green-600 truncate"
                    >
                      {r.listingTitle ?? "Deleted listing"}
                    </Link>
                    <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      {r.reason.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    Reported by {r.reporterName} · {r.createdAt.toLocaleDateString()}
                  </p>
                  <div className="flex gap-1.5">
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
                        Review & Remove
                      </button>
                    </form>
                    <form action={dismissReport}>
                      <input type="hidden" name="reportId" value={r.id} />
                      <button className="rounded-md border border-gray-300 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50">
                        Dismiss
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Open Disputes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Open Disputes</h2>
            <Link href="/admin/disputes" className="text-xs text-green-600 hover:text-green-700">
              View all
            </Link>
          </div>
          {recentDisputes.length === 0 ? (
            <p className="text-sm text-gray-400">No open disputes</p>
          ) : (
            <div className="space-y-2">
              {recentDisputes.map((d) => (
                <div key={d.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Link
                      href={`/listing/${d.listingId}`}
                      className="text-sm font-medium text-gray-900 hover:text-green-600 truncate"
                    >
                      {d.listingTitle ?? "Deleted listing"}
                    </Link>
                    <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      {d.reason.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    Filed by {d.filerName} · {d.createdAt.toLocaleDateString()}
                  </p>
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
