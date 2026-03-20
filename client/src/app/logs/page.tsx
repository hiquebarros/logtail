import { Suspense } from "react";
import { LogsPageClient } from "./logs-page-client";

export const dynamic = "force-dynamic";

export default function LogsPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center text-zinc-400">Loading logs...</main>}>
      <LogsPageClient />
    </Suspense>
  );
}
