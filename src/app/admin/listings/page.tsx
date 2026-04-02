import { db } from "@/lib/db";
import { listings, users } from "@/lib/db/schema";
import { eq, like, desc } from "drizzle-orm";
import Link from "next/link";
import { adminRemoveListing, adminRestoreListing } from "@/lib/admin-actions";

const STATUS_TABS = ["all", "active", "paused", "rented", "removed"] as const;

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  rented: "bg-blue-100 text-blue-800",
  removed: "bg-red-100 text-red-800",
};

export default async function AdminListings({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const statusFilter = STATUS_TABS.includes(params.status as typeof STATUS_TABS[number])
    ? params.status!
    : "all";

  let allListings = await db
    .select({
      id: listings.id,
      title: listings.title,
      status: listings.status,
      pricePerDay: listings.pricePerDay,
      pricePerWeek: listings.pricePerWeek,
      location: listings.location,
      createdAt: listings.createdAt,
      ownerName: users.name,
    })
    .from(listings)
    .leftJoin(users, eq(listings.userId, users.id))
    .orderBy(desc(listings.createdAt));

  if (statusFilter !== "all") {
    allListings = allListings.filter((l) => l.status === statusFilter);
  }
  if (search) {
    const q = search.toLowerCase();
    allListings = allListings.filter(
      (l) => l.title.toLowerCase().includes(q) || l.ownerName?.toLowerCase().includes(q)
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form>
          <input type="hidden" name="status" value={statusFilter === "all" ? "" : statusFilter} />
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Search by title or owner..."
            className="w-full sm:w-72 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </form>
        <div className="flex gap-1">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab}
              href={`/admin/listings?status=${tab === "all" ? "" : tab}${search ? `&q=${search}` : ""}`}
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
      </div>

      {allListings.length === 0 ? (
        <p className="text-sm text-gray-400">No listings found</p>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allListings.map((l) => (
                <tr key={l.id} className={l.status === "removed" ? "bg-red-50/50" : ""}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/listing/${l.id}`}
                      className="font-medium text-gray-900 hover:text-green-600"
                    >
                      {l.title}
                    </Link>
                    <p className="text-[10px] text-gray-400">{l.createdAt.toLocaleDateString()}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{l.ownerName}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {l.pricePerDay ? `$${l.pricePerDay}/day` : l.pricePerWeek ? `$${l.pricePerWeek}/wk` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-32 truncate">{l.location}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColors[l.status]}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {l.status !== "removed" ? (
                      <form action={adminRemoveListing}>
                        <input type="hidden" name="listingId" value={l.id} />
                        <button className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-red-700">
                          Remove
                        </button>
                      </form>
                    ) : (
                      <form action={adminRestoreListing}>
                        <input type="hidden" name="listingId" value={l.id} />
                        <button className="rounded-md bg-green-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-green-700">
                          Restore
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
