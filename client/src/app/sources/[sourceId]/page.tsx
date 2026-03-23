"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { fetchSourceById, updateSourceById } from "@/lib/api/client";

const PLATFORM_LABEL: Record<string, string> = {
  JS: "JavaScript",
  PHP: "PHP",
  GO: "Go",
  PYTHON: "Python",
  OTHER: "Other"
};

const INGESTION_ROUTE = "/api/logs";

export default function SourceDetailsPage() {
  const queryClient = useQueryClient();
  const params = useParams<{ sourceId: string }>();
  const sourceId = params.sourceId;
  const [draftName, setDraftName] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"success" | "error">("success");

  const sourceQuery = useQuery({
    queryKey: ["source", sourceId],
    queryFn: () => fetchSourceById(sourceId),
    enabled: Boolean(sourceId)
  });

  const source = sourceQuery.data?.data;

  const saveMutation = useMutation({
    mutationFn: (nextName: string) =>
      updateSourceById(sourceId, {
        name: nextName
      }),
    onSuccess: async (payload) => {
      setFeedbackTone("success");
      setFeedback("Changes saved.");
      setDraftName(null);
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.setQueryData(["source", sourceId], payload);
    },
    onError: (error) => {
      setFeedbackTone("error");
      setFeedback(error instanceof Error ? error.message : "Failed to save changes");
    }
  });

  if (sourceQuery.isLoading) {
    return <main className="p-6 text-sm text-zinc-400">Loading source details...</main>;
  }

  if (sourceQuery.isError || !sourceQuery.data) {
    const message =
      sourceQuery.error instanceof Error ? sourceQuery.error.message : "Failed to load source";
    return (
      <main className="space-y-3 p-6 text-sm text-rose-300">
        <p>{message}</p>
        <Link href="/sources" className="text-cyan-300 underline underline-offset-2">
          Back to sources
        </Link>
      </main>
    );
  }

  if (!source) {
    return <main className="p-6 text-sm text-zinc-400">Loading source details...</main>;
  }

  const currentName = draftName ?? source.name;
  const trimmedName = currentName.trim();
  const canSave = trimmedName.length > 0 && trimmedName.length <= 255;
  const isDirty = trimmedName !== source.name;
  const ingestionHost = INGESTION_ROUTE;
  const platformLabel = PLATFORM_LABEL[source.language] || source.language;
  const verifyCommand = `curl -X POST \\
  -H 'Content-Type: application/json' \\
  -d '{"applicationId":"${source.id}","logs":[{"timestamp":"'"$(date -u +'%Y-%m-%dT%H:%M:%SZ')"'","level":"info","message":"Hello from Logtail!","metadata":{"source":"curl"}}]}' \\
  http://localhost:3000${ingestionHost}`;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    if (!canSave || !isDirty || saveMutation.isPending) {
      return;
    }
    void saveMutation.mutateAsync(trimmedName);
  };

  return (
    <main className="space-y-8 p-4">
      <form className="space-y-8" onSubmit={onSubmit}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Source details</p>
            <h1 className="text-lg font-semibold text-zinc-100">{source.name}</h1>
          </div>
          <Link
            href="/sources"
            className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-800"
          >
            Back
          </Link>
        </div>

        <section className="grid gap-4 xl:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-100">Basic information</h2>
            <p className="text-sm text-zinc-400">
              Need help with the integration? Contact{" "}
              <a className="underline" href="mailto:hello@betterstack.com">
                hello@betterstack.com
              </a>
              .
            </p>
          </div>

          <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-zinc-500">Name</span>
                <input
                  value={currentName}
                  onChange={(event) => setDraftName(event.target.value)}
                  required
                  className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none ring-cyan-500 focus:ring-2"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-zinc-500">Source token</span>
                <input
                  value={source.apiKey}
                  readOnly
                  className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 font-mono text-xs text-zinc-300"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-zinc-500">Platform</span>
                <input
                  value={platformLabel}
                  readOnly
                  className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-300"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-zinc-500">Source ID</span>
                <input
                  value={source.id}
                  readOnly
                  className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 font-mono text-xs text-zinc-300"
                />
              </label>
            </div>

            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-zinc-500">Ingestion host</span>
              <input
                value={ingestionHost}
                readOnly
                className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 font-mono text-xs text-zinc-300"
              />
            </label>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-100">Verify data collection</h2>
            <p className="text-sm text-zinc-400">
              Need help?{" "}
              <a className="underline" href="mailto:hello@betterstack.com">
                Chat with an expert
              </a>
              .
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50">
            <div className="space-y-3 border-b border-zinc-800 p-5 text-sm">
              <p className="text-zinc-200">Waiting for logs...</p>
              <p className="text-zinc-400">
                Once logs arrive, verify them in{" "}
                <Link className="text-cyan-300 underline underline-offset-2" href="/logs">
                  Live Tail
                </Link>
                .
              </p>
            </div>
            <div className="space-y-2 p-5">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Run the following command in your terminal
              </p>
              <textarea
                readOnly
                value={verifyCommand}
                rows={7}
                className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-300"
              />
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          {feedback ? (
            <p className={`text-sm ${feedbackTone === "success" ? "text-emerald-300" : "text-rose-300"}`}>
              {feedback}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!canSave || !isDirty || saveMutation.isPending}
            className="h-10 rounded-md border border-cyan-500/60 bg-cyan-500/10 px-4 text-sm text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saveMutation.isPending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </main>
  );
}
