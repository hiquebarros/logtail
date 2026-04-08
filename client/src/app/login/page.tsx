"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

type MeResponse = {
  user?: {
    id: string;
    email: string;
    createdAt: string;
  };
  message?: string;
};

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const nextParam = searchParams.get("next");
  const nextPath =
    nextParam && nextParam.startsWith("/") && nextParam !== "/login"
      ? nextParam
      : "/logs";

  useEffect(() => {
    const run = async () => {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        router.replace(nextPath);
        return;
      }

      setIsCheckingSession(false);
    };

    void run();
  }, [nextPath, router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as MeResponse;
      setError(payload.message || "Invalid credentials");
      setIsLoading(false);
      return;
    }

    router.push(nextPath);
  };

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
        <div className="text-sm text-zinc-400">Checking session...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <section className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="mb-1 text-lg font-semibold text-zinc-100">Sign in</h1>
        <p className="mb-6 text-sm text-zinc-400">
          Sign in to your Logmole account.
        </p>

        <form className="space-y-4" onSubmit={onSubmit}>
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

          <label className="block space-y-1">
            <span className="text-sm text-zinc-300">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none ring-cyan-500 transition focus:ring-2"
              required
            />
          </label>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button
            type="submit"
            disabled={isLoading}
            className="h-10 w-full rounded-md bg-cyan-600 text-sm font-medium text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-sm text-zinc-400">
          New to Logmole?{" "}
          <Link href="/register" className="text-cyan-300 hover:text-cyan-200">
            Create account
          </Link>
        </p>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
          <div className="text-sm text-zinc-400">Loading...</div>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
