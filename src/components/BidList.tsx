"use client";

import { useActionState } from "react";

interface Bid {
  id: string;
  amount: number;
  startDate: string;
  endDate: string;
  message: string | null;
  status: string;
  bidderName: string;
  bidderId: string;
  createdAt: string;
}

interface BidListProps {
  bids: Bid[];
  isOwner: boolean;
  currentUserId: string | null;
  acceptAction: (formData: FormData) => Promise<void>;
  declineAction: (formData: FormData) => Promise<void>;
  withdrawAction: (formData: FormData) => Promise<void>;
}

function BidCard({
  bid,
  isOwner,
  isOwnBid,
  acceptAction,
  declineAction,
  withdrawAction,
}: {
  bid: Bid;
  isOwner: boolean;
  isOwnBid: boolean;
  acceptAction: (formData: FormData) => Promise<void>;
  declineAction: (formData: FormData) => Promise<void>;
  withdrawAction: (formData: FormData) => Promise<void>;
}) {
  async function handleAction(
    action: (formData: FormData) => Promise<void>,
    _prevState: string | null,
    formData: FormData
  ) {
    try {
      await action(formData);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Something went wrong";
    }
  }

  const [acceptError, acceptFormAction, acceptPending] = useActionState(
    (prev: string | null, fd: FormData) => handleAction(acceptAction, prev, fd),
    null
  );
  const [declineError, declineFormAction, declinePending] = useActionState(
    (prev: string | null, fd: FormData) => handleAction(declineAction, prev, fd),
    null
  );
  const [withdrawError, withdrawFormAction, withdrawPending] = useActionState(
    (prev: string | null, fd: FormData) => handleAction(withdrawAction, prev, fd),
    null
  );

  const error = acceptError || declineError || withdrawError;

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-green-100 text-green-800",
    declined: "bg-red-100 text-red-800",
    withdrawn: "bg-gray-100 text-gray-500",
    expired: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="text-sm font-semibold text-green-700">
            ${bid.amount.toFixed(2)}
          </span>
          <span className="text-xs text-gray-400 ml-2">
            {isOwner ? `from ${bid.bidderName}` : isOwnBid ? "Your offer" : `by ${bid.bidderName}`}
          </span>
        </div>
        <span
          className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full font-medium ${statusColors[bid.status] || "bg-gray-100 text-gray-500"}`}
        >
          {bid.status}
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-1">
        {bid.startDate} — {bid.endDate}
      </p>

      {bid.message && (
        <p className="text-xs text-gray-600 mb-2 italic">&ldquo;{bid.message}&rdquo;</p>
      )}

      <p className="text-[11px] text-gray-400 mb-2">{bid.createdAt}</p>

      {error && (
        <div className="bg-red-50 text-red-700 p-1.5 rounded text-xs mb-2">
          {error}
        </div>
      )}

      {bid.status === "pending" && (
        <div className="flex gap-2">
          {isOwner && (
            <>
              <form action={acceptFormAction}>
                <input type="hidden" name="bidId" value={bid.id} />
                <button
                  type="submit"
                  disabled={acceptPending}
                  className="rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {acceptPending ? "..." : "Accept"}
                </button>
              </form>
              <form action={declineFormAction}>
                <input type="hidden" name="bidId" value={bid.id} />
                <button
                  type="submit"
                  disabled={declinePending}
                  className="rounded border border-red-300 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {declinePending ? "..." : "Decline"}
                </button>
              </form>
            </>
          )}
          {isOwnBid && (
            <form action={withdrawFormAction}>
              <input type="hidden" name="bidId" value={bid.id} />
              <button
                type="submit"
                disabled={withdrawPending}
                className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {withdrawPending ? "..." : "Withdraw"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default function BidList({
  bids: bidList,
  isOwner,
  currentUserId,
  acceptAction,
  declineAction,
  withdrawAction,
}: BidListProps) {
  if (bidList.length === 0) return null;

  const pendingBids = bidList.filter((b) => b.status === "pending");
  const otherBids = bidList.filter((b) => b.status !== "pending");

  return (
    <div className="mt-6 border-t border-gray-200 pt-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Offers
        {pendingBids.length > 0 && (
          <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
            {pendingBids.length} pending
          </span>
        )}
      </h3>
      <div className="space-y-2">
        {pendingBids.map((bid) => (
          <BidCard
            key={bid.id}
            bid={bid}
            isOwner={isOwner}
            isOwnBid={bid.bidderId === currentUserId}
            acceptAction={acceptAction}
            declineAction={declineAction}
            withdrawAction={withdrawAction}
          />
        ))}
        {otherBids.map((bid) => (
          <BidCard
            key={bid.id}
            bid={bid}
            isOwner={isOwner}
            isOwnBid={bid.bidderId === currentUserId}
            acceptAction={acceptAction}
            declineAction={declineAction}
            withdrawAction={withdrawAction}
          />
        ))}
      </div>
    </div>
  );
}
