"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ApiMessage = {
  message?: string;
};

function VerifyEmailPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [email, setEmail] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isResending, setIsResending] = useState(false);

  const onVerify = async () => {
    if (!token) {
      setVerifyError("Missing verification token.");
      setIsVerifying(false);
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);

    const response = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ token })
    });
    const payload = (await response.json().catch(() => ({}))) as ApiMessage;

    if (!response.ok) {
      setVerifyError(payload.message || "Could not verify email.");
      setIsVerifying(false);
      return;
    }

    router.replace("/logs");
  };

  useEffect(() => {
    void onVerify();
    // Run once for the current tokenized URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onResend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsResending(true);
    setResendError(null);
    setResendMessage(null);

    const response = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    });
    const payload = (await response.json().catch(() => ({}))) as ApiMessage;

    if (!response.ok) {
      setResendError(payload.message || "Could not resend verification email.");
      setIsResending(false);
      return;
    }

    setResendMessage(
      payload.message || "If your account exists, a new verification email has been sent."
    );
    setIsResending(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <section className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="mb-1 text-lg font-semibold text-zinc-100">Verify your email</h1>
        <p className="mb-6 text-sm text-zinc-400">
          {isVerifying
            ? "We are confirming your account now."
            : "Confirm your account to start using Logtail."}
        </p>

        {isVerifying ? (
          <div className="mb-4 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
            Verifying your email...
          </div>
        ) : null}

        {verifyError ? <p className="mb-4 text-sm text-rose-300">{verifyError}</p> : null}

        {!isVerifying ? <div className="my-4 border-t border-zinc-800" /> : null}

        {!isVerifying ? (
          <form className="space-y-3" onSubmit={onResend}>
            <p className="text-sm text-zinc-300">Need a new verification link?</p>
            <label className="block space-y-1">
              <span className="text-sm text-zinc-300">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none ring-cyan-500 transition focus:ring-2"
                required
              />
            </label>
            {resendError ? <p className="text-sm text-rose-300">{resendError}</p> : null}
            {resendMessage ? <p className="text-sm text-emerald-300">{resendMessage}</p> : null}
            <button
              type="submit"
              disabled={isResending}
              className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResending ? "Sending..." : "Resend verification email"}
            </button>
          </form>
        ) : null}

        <p className="mt-5 text-sm text-zinc-400">
          Back to{" "}
          <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
          <div className="text-sm text-zinc-400">Loading...</div>
        </main>
      }
    >
      <VerifyEmailPageContent />
    </Suspense>
  );
}
