"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PayoutSettings({
  connectOnboarded,
  hasConnectAccount,
}: {
  connectOnboarded: boolean;
  hasConnectAccount: boolean;
}) {
  const searchParams = useSearchParams();
  const connectStatus = searchParams.get("connect");
  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  async function startOnboarding() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(false);
    }
  }

  async function openDashboard() {
    setDashboardLoading(true);
    try {
      const res = await fetch("/api/stripe/connect/dashboard", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      // ignore
    } finally {
      setDashboardLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-800 mb-1">Payouts</h2>
      <p className="text-xs text-gray-400 mb-4">
        Connect your bank account to receive earnings when rentals complete.
        RentNeighbor takes a 10% platform fee.
      </p>

      {connectStatus === "return" && !connectOnboarded && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs rounded-lg px-3 py-2 mb-3">
          Your account is being reviewed by Stripe. This usually takes a few
          minutes. Refresh this page to check.
        </div>
      )}

      {connectStatus === "refresh" && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2 mb-3">
          Your onboarding session expired. Please try again.
        </div>
      )}

      {connectOnboarded ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-5 h-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <span className="text-sm font-medium text-green-700">
              Payouts enabled
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Earnings are automatically transferred to your connected bank
            account when rentals complete.
          </p>
          <button
            onClick={openDashboard}
            disabled={dashboardLoading}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {dashboardLoading ? "Opening..." : "View Stripe Dashboard"}
          </button>
        </div>
      ) : (
        <div>
          {hasConnectAccount && (
            <p className="text-xs text-amber-600 mb-3">
              You started onboarding but haven&apos;t finished yet. Click below
              to continue.
            </p>
          )}
          <button
            onClick={startOnboarding}
            disabled={loading}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading
              ? "Redirecting to Stripe..."
              : hasConnectAccount
                ? "Continue Setup"
                : "Set Up Payouts"}
          </button>
        </div>
      )}
    </div>
  );
}
