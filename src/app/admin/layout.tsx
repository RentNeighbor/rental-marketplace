import Link from "next/link";

const tabs = [
  { label: "Overview", href: "/admin" },
  { label: "Reports", href: "/admin/reports" },
  { label: "Disputes", href: "/admin/disputes" },
  { label: "Users", href: "/admin/users" },
  { label: "Listings", href: "/admin/listings" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">Manage reports, disputes, users, and listings</p>
      <nav className="flex gap-1 border-b border-gray-200 mb-8">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-t-md -mb-px border-b-2 border-transparent hover:border-green-600 transition-colors"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
