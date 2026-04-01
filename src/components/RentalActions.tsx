"use client";

import { useActionState, useState } from "react";

interface Extension {
  id: string;
  newEndDate: string;
  newEndDateRaw: string;
  message: string | null;
  status: string;
  additionalPrice: number | null;
}

interface Rental {
  id: string;
  startDate: string;
  endDate: string;
  endDateRaw: string;
  totalPrice: number | null;
  status: string;
  renterName: string;
  renterId: string;
  ownerNotes: string | null;
  listingTitle: string;
  extensions: Extension[];
}

interface RentalActionsProps {
  rental: Rental;
  isOwner: boolean;
  approveAction: (formData: FormData) => Promise<void>;
  declineAction: (formData: FormData) => Promise<void>;
  cancelAction: (formData: FormData) => Promise<void>;
  completeAction: (formData: FormData) => Promise<void>;
  requestExtensionAction: (formData: FormData) => Promise<void>;
  approveExtensionAction: (formData: FormData) => Promise<void>;
  declineExtensionAction: (formData: FormData) => Promise<void>;
}

export default function RentalActions({
  rental,
  isOwner,
  approveAction,
  declineAction,
  cancelAction,
  completeAction,
  requestExtensionAction,
  approveExtensionAction,
  declineExtensionAction,
}: RentalActionsProps) {
  const [showExtensionForm, setShowExtensionForm] = useState(false);

  function wrap(action: (formData: FormData) => Promise<void>) {
    return async (_prev: string | null, fd: FormData) => {
      try { await action(fd); return null; }
      catch (e) { return e instanceof Error ? e.message : "Something went wrong"; }
    };
  }

  const [approveError, approveFormAction, approvePending] = useActionState(wrap(approveAction), null);
  const [declineError, declineFormAction, declinePending] = useActionState(wrap(declineAction), null);
  const [cancelError, cancelFormAction, cancelPending] = useActionState(wrap(cancelAction), null);
  const [completeError, completeFormAction, completePending] = useActionState(wrap(completeAction), null);
  const [extError, extFormAction, extPending] = useActionState(wrap(requestExtensionAction), null);
  const [approveExtError, approveExtFormAction, approveExtPending] = useActionState(wrap(approveExtensionAction), null);
  const [declineExtError, declineExtFormAction, declineExtPending] = useActionState(wrap(declineExtensionAction), null);

  const error = approveError || declineError || cancelError || completeError || extError || approveExtError || declineExtError;

  const pendingExtension = rental.extensions.find((e) => e.status === "pending");
  const hasPendingExtension = !!pendingExtension;

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    active: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    declined: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {isOwner ? `Request from ${rental.renterName}` : rental.listingTitle}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {rental.startDate} — {rental.endDate}
          </p>
        </div>
        <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${statusColors[rental.status] || "bg-gray-100 text-gray-600"}`}>
          {rental.status}
        </span>
      </div>

      {rental.totalPrice && (
        <p className="text-sm text-gray-700 mb-2">
          Total: <span className="font-medium">${rental.totalPrice.toFixed(2)}</span>
        </p>
      )}

      {rental.ownerNotes && (
        <p className="text-xs text-gray-500 mb-2 italic">Note: {rental.ownerNotes}</p>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-2 rounded text-xs mb-2">{error}</div>
      )}

      <div className="flex gap-2 flex-wrap">
        {isOwner && rental.status === "pending" && (
          <>
            <form action={approveFormAction}>
              <input type="hidden" name="rentalId" value={rental.id} />
              <button type="submit" disabled={approvePending}
                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                {approvePending ? "..." : "Approve"}
              </button>
            </form>
            <form action={declineFormAction}>
              <input type="hidden" name="rentalId" value={rental.id} />
              <button type="submit" disabled={declinePending}
                className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
                {declinePending ? "..." : "Decline"}
              </button>
            </form>
          </>
        )}

        {isOwner && rental.status === "active" && (
          <form action={completeFormAction}>
            <input type="hidden" name="rentalId" value={rental.id} />
            <button type="submit" disabled={completePending}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {completePending ? "..." : "Mark Completed"}
            </button>
          </form>
        )}

        {!isOwner && rental.status === "pending" && (
          <form action={cancelFormAction}>
            <input type="hidden" name="rentalId" value={rental.id} />
            <button type="submit" disabled={cancelPending}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
              {cancelPending ? "..." : "Cancel Request"}
            </button>
          </form>
        )}

        {!isOwner && rental.status === "active" && !hasPendingExtension && (
          <button
            type="button"
            onClick={() => setShowExtensionForm(!showExtensionForm)}
            className="rounded-md border border-blue-300 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 transition-colors"
          >
            {showExtensionForm ? "Cancel" : "Request Extension"}
          </button>
        )}
      </div>

      {/* Extension request form — renter */}
      {!isOwner && rental.status === "active" && showExtensionForm && (
        <form action={extFormAction} className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <input type="hidden" name="rentalId" value={rental.id} />
          <p className="text-xs font-medium text-gray-700">Request an extension</p>
          <div>
            <label className="block text-xs text-gray-500 mb-1">New end date</label>
            <input
              type="date"
              name="newEndDate"
              required
              min={rental.endDateRaw}
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Message (optional)</label>
            <input
              type="text"
              name="message"
              placeholder="Reason for extension..."
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={extPending}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {extPending ? "Sending..." : "Send Request"}
          </button>
        </form>
      )}

      {/* Pending extension shown to renter */}
      {!isOwner && pendingExtension && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">
            Extension request pending — new end date:{" "}
            <span className="font-medium">{pendingExtension.newEndDate}</span>
            {pendingExtension.additionalPrice && (
              <span className="ml-1">(+${pendingExtension.additionalPrice.toFixed(2)})</span>
            )}
          </p>
        </div>
      )}

      {/* Pending extension shown to owner with approve/decline */}
      {isOwner && pendingExtension && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-700 mb-1.5">Extension request</p>
          <p className="text-xs text-gray-500 mb-2">
            New end date: <span className="font-medium text-gray-800">{pendingExtension.newEndDate}</span>
            {pendingExtension.additionalPrice && (
              <span className="ml-1 text-green-700">(+${pendingExtension.additionalPrice.toFixed(2)})</span>
            )}
            {pendingExtension.message && (
              <span className="ml-1 italic">— "{pendingExtension.message}"</span>
            )}
          </p>
          <div className="flex gap-2">
            <form action={approveExtFormAction}>
              <input type="hidden" name="extensionId" value={pendingExtension.id} />
              <button type="submit" disabled={approveExtPending}
                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                {approveExtPending ? "..." : "Approve Extension"}
              </button>
            </form>
            <form action={declineExtFormAction}>
              <input type="hidden" name="extensionId" value={pendingExtension.id} />
              <button type="submit" disabled={declineExtPending}
                className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
                {declineExtPending ? "..." : "Decline"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Past extensions history */}
      {rental.extensions.filter((e) => e.status !== "pending").length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
          {rental.extensions.filter((e) => e.status !== "pending").map((e) => (
            <p key={e.id} className="text-xs text-gray-400">
              Extension to {e.newEndDate}:{" "}
              <span className={e.status === "approved" ? "text-green-600" : "text-red-500"}>
                {e.status}
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
