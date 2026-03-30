"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type RegisterResponse = {
  message?: string;
};

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        email,
        password
      })
    });

    const payload = (await response.json().catch(() => ({}))) as RegisterResponse;

    if (!response.ok) {
      setError(payload.message || "Could not create account");
      setIsLoading(false);
      return;
    }

    setSuccessMessage(
      payload.message || "Account created. Check your inbox to verify your email."
    );
    setIsLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <section className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="mb-1 text-lg font-semibold text-zinc-100">Create account</h1>
        <p className="mb-6 text-sm text-zinc-400">
          Start your Logtail workspace. We&apos;ll send a confirmation link to your email.
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
          {successMessage ? <p className="text-sm text-emerald-300">{successMessage}</p> : null}

          <button
            type="submit"
            disabled={isLoading}
            className="h-10 w-full rounded-md bg-cyan-600 text-sm font-medium text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
