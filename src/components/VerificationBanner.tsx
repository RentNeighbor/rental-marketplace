"use client";

import { useState } from "react";

export default function VerificationBanner() {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleResend() {
    setResending(true);
    const res = await fetch("/api/auth/resend-verification", { method: "POST" });
    setResending(false);
    if (res.ok) setResent(true);
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2.5 text-center text-sm text-yellow-800">
      Please verify your email to post listings and book rentals.{" "}
      {resent ? (
        <span className="text-green-700 font-medium">Verification email sent!</span>
      ) : (
        <button
          onClick={handleResend}
          disabled={resending}
          className="underline hover:text-yellow-900 disabled:opacity-50"
        >
          {resending ? "Sending..." : "Resend verification email"}
        </button>
      )}
    </div>
  );
}
