import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notificationPreferences, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import NotificationSettingsForm from "@/components/NotificationSettingsForm";
import PayoutSettings from "@/components/PayoutSettings";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [prefs, user] = await Promise.all([
    db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, session.user.id),
    }),
    db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">
        Manage your payouts and notification preferences.
      </p>

      <div className="space-y-6">
        <PayoutSettings
          connectOnboarded={user?.stripeConnectOnboarded ?? false}
          hasConnectAccount={!!user?.stripeConnectAccountId}
        />

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Notification Preferences
          </h2>
          <NotificationSettingsForm
            emailEnabled={prefs?.emailEnabled ?? false}
            smsEnabled={prefs?.smsEnabled ?? false}
            phoneNumber={prefs?.phoneNumber ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
