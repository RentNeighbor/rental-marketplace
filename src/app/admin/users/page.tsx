import { db } from "@/lib/db";
import { users, listings, rentals } from "@/lib/db/schema";
import { eq, sql, or, like, desc } from "drizzle-orm";
import { suspendUser, unsuspendUser } from "@/lib/admin-actions";

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const search = params.q?.trim() ?? "";

  const baseQuery = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      suspendedAt: users.suspendedAt,
      listingCount: sql<number>`(SELECT count(*) FROM listings WHERE listings.user_id = users.id)`,
      rentalCount: sql<number>`(SELECT count(*) FROM rentals WHERE rentals.renter_id = users.id)`,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  const allUsers = search
    ? await baseQuery.where(
        or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`)
        )
      )
    : await baseQuery;

  return (
    <div>
      <form className="mb-6">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Search by name or email..."
          className="w-full max-w-md rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </form>

      {allUsers.length === 0 ? (
        <p className="text-sm text-gray-400">No users found</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {allUsers.map((u) => (
              <div key={u.id} className={`border border-gray-200 rounded-lg p-3 ${u.suspendedAt ? "bg-red-50/50" : "bg-white"}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  {u.suspendedAt ? (
                    <span className="shrink-0 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                      Suspended
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                  <span>Joined {u.createdAt.toLocaleDateString()}</span>
                  <span>{u.listingCount} listings</span>
                  <span>{u.rentalCount} rentals</span>
                </div>
                {u.suspendedAt ? (
                  <form action={unsuspendUser}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                      Unsuspend
                    </button>
                  </form>
                ) : (
                  <form action={suspendUser}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                      Suspend
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium text-center">Listings</th>
                  <th className="px-4 py-3 font-medium text-center">Rentals</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allUsers.map((u) => (
                  <tr key={u.id} className={u.suspendedAt ? "bg-red-50/50" : ""}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {u.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-600">{u.listingCount}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-600">{u.rentalCount}</td>
                    <td className="px-4 py-3">
                      {u.suspendedAt ? (
                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                          Suspended
                        </span>
                      ) : (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.suspendedAt ? (
                        <form action={unsuspendUser}>
                          <input type="hidden" name="userId" value={u.id} />
                          <button className="rounded-md bg-green-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-green-700">
                            Unsuspend
                          </button>
                        </form>
                      ) : (
                        <form action={suspendUser}>
                          <input type="hidden" name="userId" value={u.id} />
                          <button className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-red-700">
                            Suspend
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
