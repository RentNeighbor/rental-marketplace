"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token || !email) {
      setStatus("error");
      setError("Invalid verification link.");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus("success");
          setTimeout(() => router.push("/"), 3000);
        } else {
          const data = await res.json();
          setStatus("error");
          setError(data.error || "Verification failed");
        }
      })
      .catch(() => {
        setStatus("error");
        setError("Something went wrong");
      });
  }, [token, email, router]);

  async function handleResend() {
    setResending(true);
    const res = await fetch("/api/auth/resend-verification", { method: "POST" });
    setResending(false);
    if (res.ok) {
      setResent(true);
    } else if (res.status === 401) {
      setError("Please log in first, then resend the verification email from the banner at the top of the page.");
    } else {
      setError("Failed to resend. Please try again later.");
    }
  }

  if (status === "verifying") {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Verifying Email</h1>
        <p className="text-sm text-gray-600">Please wait...</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Email Verified</h1>
        <p className="text-sm text-gray-600 mb-4">
          Your email has been verified. Redirecting...
        </p>
        <Link href="/" className="text-sm text-green-700 hover:underline">
          Go to homepage
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Verification Failed</h1>
      <p className="text-sm text-gray-600 mb-4">{error}</p>
      {resent ? (
        <p className="text-sm text-green-700">A new verification email has been sent.</p>
      ) : (
        <button
          onClick={handleResend}
          disabled={resending}
          className="text-sm text-green-700 hover:underline disabled:opacity-50"
        >
          {resending ? "Sending..." : "Resend verification email"}
        </button>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
