"use client";

import { useActionState, useState } from "react";

interface MessageOwnerButtonProps {
  listingId: string;
  ownerName: string;
  submitAction: (formData: FormData) => Promise<void>;
}

export default function MessageOwnerButton({
  listingId,
  ownerName,
  submitAction,
}: MessageOwnerButtonProps) {
  const [showForm, setShowForm] = useState(false);

  async function formAction(_prevState: string | null, formData: FormData) {
    try {
      await submitAction(formData);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Something went wrong";
    }
  }

  const [error, action, isPending] = useActionState(formAction, null);

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="w-full rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700 transition-colors"
      >
        Message {ownerName}
      </button>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      {error && (
        <div className="bg-red-50 text-red-700 p-2.5 rounded text-xs mb-3">
          {error}
        </div>
      )}
      <form action={action} className="space-y-3">
        <input type="hidden" name="listingId" value={listingId} />
        <textarea
          name="message"
          required
          rows={3}
          placeholder={`Hi ${ownerName}, I'm interested in renting this...`}
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Sending..." : "Send Message"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
