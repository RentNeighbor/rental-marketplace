"use client";

import { useState } from "react";
import { useActionState } from "react";
import { updateNotificationPreferences } from "@/lib/actions";

interface Props {
  emailEnabled: boolean;
  smsEnabled: boolean;
  phoneNumber: string;
}

export default function NotificationSettingsForm({
  emailEnabled: initialEmail,
  smsEnabled: initialSms,
  phoneNumber: initialPhone,
}: Props) {
  const [smsEnabled, setSmsEnabled] = useState(initialSms);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(_prev: unknown, formData: FormData) {
    try {
      await updateNotificationPreferences(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }

  const [error, action, isPending] = useActionState(handleSubmit, null);

  return (
    <form action={action} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded text-sm">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-green-50 text-green-700 p-3 rounded text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Preferences saved successfully
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Notification Channels
        </h3>
        <p className="text-sm text-gray-500">
          In-app notifications are always enabled. Choose additional channels below.
        </p>

        <label className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="checkbox"
            name="emailEnabled"
            defaultChecked={initialEmail}
            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">Email notifications</p>
            <p className="text-xs text-gray-500">
              Receive alerts at your account email address
            </p>
          </div>
        </label>

        <label className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="checkbox"
            name="smsEnabled"
            defaultChecked={initialSms}
            onChange={(e) => setSmsEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">SMS / Phone notifications</p>
            <p className="text-xs text-gray-500">
              Receive text message alerts on your phone
            </p>
          </div>
        </label>

        {smsEnabled && (
          <div className="ml-7 pl-4 border-l-2 border-green-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone number
            </label>
            <input
              type="tel"
              name="phoneNumber"
              defaultValue={initialPhone}
              placeholder="+1 (555) 123-4567"
              className="w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Include country code for international numbers
            </p>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save Preferences"}
      </button>
    </form>
  );
}
