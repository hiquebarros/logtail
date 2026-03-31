"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, ReactNode, useState } from "react";
import { fetchSourceById, updateSourceById } from "@/lib/api/client";

const PLATFORM_LABEL: Record<string, string> = {
  JS: "JavaScript",
  PHP: "PHP",
  GO: "Go",
  PYTHON: "Python",
  OTHER: "Other"
};

function getIngestionApiUrl(): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_INGESTION_API_URL?.trim() ?? "";
  if (!configuredBaseUrl) {
    return "/logs";
  }

  return `${configuredBaseUrl.replace(/\/+$/, "")}/logs`;
}

function IconWrap({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-zinc-300">
      {children}
    </span>
  );
}

function JsIcon() {
  return (
    <IconWrap>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M3 3h18v18H3z" />
        <path d="M13.5 16.6l1.4-.9c.3.6.6 1.1 1.4 1.1s1.2-.3 1.2-.8c0-.6-.5-.8-1.3-1.2l-.4-.2c-1.1-.5-1.8-1.1-1.8-2.4 0-1.2.9-2.1 2.3-2.1 1 0 1.7.3 2.2 1.3l-1.2.8c-.3-.5-.5-.7-1-.7s-.8.3-.8.7c0 .5.3.7 1 .9l.4.2c1.3.5 2 1.2 2 2.6 0 1.5-1.2 2.3-2.7 2.3-1.5 0-2.5-.7-3-1.6zm-5.8.1l1.1-1c.2.4.4.7.8.7.4 0 .6-.2.6-.9v-4.9h1.5v4.9c0 1.5-.9 2.2-2.1 2.2-1.1 0-1.8-.6-2.1-1.1z" fill="#111827" />
      </svg>
    </IconWrap>
  );
}

function PhpIcon() {
  return (
    <IconWrap>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <ellipse cx="12" cy="12" rx="9" ry="5.8" />
        <path d="M8 12h1.8a1.4 1.4 0 0 0 0-2.8H8V15M12.2 15v-5.8H14a1.4 1.4 0 0 1 0 2.8h-1.8M16.3 15V9.2" />
      </svg>
    </IconWrap>
  );
}

function GoIcon() {
  return (
    <IconWrap>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 12h7M4 9h6M4 15h6" />
        <circle cx="15.8" cy="12" r="3.2" />
        <circle cx="17" cy="11" r=".7" fill="currentColor" stroke="none" />
      </svg>
    </IconWrap>
  );
}

function PythonIcon() {
  return (
    <IconWrap>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M8 5h5a3 3 0 0 1 3 3v2H9a2 2 0 0 0-2 2v3H6a2 2 0 0 1-2-2V9a4 4 0 0 1 4-4z" />
        <path d="M16 19h-5a3 3 0 0 1-3-3v-2h7a2 2 0 0 0 2-2V9h1a2 2 0 0 1 2 2v4a4 4 0 0 1-4 4z" />
        <circle cx="9.5" cy="7.5" r=".7" fill="currentColor" stroke="none" />
        <circle cx="14.5" cy="16.5" r=".7" fill="currentColor" stroke="none" />
      </svg>
    </IconWrap>
  );
}

function OtherIcon() {
  return (
    <IconWrap>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 12h14M12 5v14" />
      </svg>
    </IconWrap>
  );
}

const PLATFORM_ICON: Record<string, ReactNode> = {
  JS: <JsIcon />,
  PHP: <PhpIcon />,
  GO: <GoIcon />,
  PYTHON: <PythonIcon />,
  OTHER: <OtherIcon />
};

export default function SourceDetailsPage() {
  const queryClient = useQueryClient();
  const params = useParams<{ sourceId: string }>();
  const sourceId = params.sourceId?.trim() ?? "";
  const ingestionApiUrl = getIngestionApiUrl();
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

  if (!sourceId) {
    return (
      <main className="space-y-3 p-6 text-sm text-rose-300">
        <p>Source id is missing from the route.</p>
        <Link href="/sources" className="text-cyan-300 underline underline-offset-2">
          Back to sources
        </Link>
      </main>
    );
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
  const platformLabel = PLATFORM_LABEL[source.language] || source.language;
  const platformIcon = PLATFORM_ICON[source.language] || <OtherIcon />;
  const verifyCommand = `curl -X POST \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer ${source.apiKey}' \\
  -d '{"applicationId":"${source.id}","logs":[{"timestamp":"'"$(date -u +'%Y-%m-%dT%H:%M:%SZ')"'","level":"info","message":"Hello!","metadata":{"source":"curl"}}]}' \\
  ${ingestionApiUrl}`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback(null);
    } catch {
      setFeedbackTone("error");
      setFeedback("Failed to copy to clipboard.");
    }
  };

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
              Information needed to ingest logs into the platform.
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
                <div className="group relative">
                  <input
                    value={source.apiKey}
                    readOnly
                    title="Copy to clipboard"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void copyToClipboard(source.apiKey)}
                    className="h-10 w-full cursor-pointer rounded-md border border-zinc-800 bg-zinc-900/70 px-3 font-mono text-xs text-zinc-400 outline-none focus:border-zinc-800 focus:outline-none focus:ring-0"
                  />
                  <span className="pointer-events-none absolute -top-7 right-2 rounded border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-[10px] text-zinc-300 opacity-0 transition group-hover:opacity-100">
                    Click to copy
                  </span>
                </div>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-zinc-500">Platform</span>
                <div className="pointer-events-none flex h-10 w-full items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/70 px-3 text-sm text-zinc-400 opacity-90">
                  {platformIcon}
                  <span>{platformLabel}</span>
                </div>
              </label>

              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-zinc-500">Source ID</span>
                <div className="group relative">
                  <input
                    value={source.id}
                    readOnly
                    title="Copy to clipboard"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void copyToClipboard(source.id)}
                    className="h-10 w-full cursor-pointer rounded-md border border-zinc-800 bg-zinc-900/70 px-3 font-mono text-xs text-zinc-400 outline-none focus:border-zinc-800 focus:outline-none focus:ring-0"
                  />
                  <span className="pointer-events-none absolute -top-7 right-2 rounded border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-[10px] text-zinc-300 opacity-0 transition group-hover:opacity-100">
                    Click to copy
                  </span>
                </div>
              </label>
            </div>

            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-zinc-500">Ingestion API</span>
              <div className="group relative">
                <input
                  value={ingestionApiUrl}
                  readOnly
                  title="Copy to clipboard"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void copyToClipboard(ingestionApiUrl)}
                  className="h-10 w-full cursor-pointer rounded-md border border-zinc-800 bg-zinc-900/70 px-3 font-mono text-xs text-zinc-400 outline-none focus:border-zinc-800 focus:outline-none focus:ring-0"
                />
                <span className="pointer-events-none absolute -top-7 right-2 rounded border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-[10px] text-zinc-300 opacity-0 transition group-hover:opacity-100">
                  Click to copy
                </span>
              </div>
            </label>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-100">Verify data collection</h2>
            <p className="text-sm text-zinc-400">
              Use this code example to verify that logs are being ingested into the platform.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50">
            <div className="space-y-3 border-b border-zinc-800 p-5 text-sm">
              <p className="text-zinc-200">Waiting for logs...</p>
              <p className="text-zinc-400">
                Once logs arrive, verify them in{" "}
                <Link
                  className="text-cyan-300 underline underline-offset-2"
                  href={`/logs?applicationId=${source.id}`}
                >
                  Live Tail
                </Link>
                .
              </p>
            </div>
            <div className="space-y-2 p-5">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Run the following command in your terminal
              </p>
              <div className="group relative">
                <textarea
                  readOnly
                  value={verifyCommand}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void copyToClipboard(verifyCommand)}
                  rows={7}
                  className="w-full resize-none cursor-pointer rounded-md border border-zinc-800 bg-zinc-900/70 p-3 font-mono text-xs leading-relaxed text-zinc-400 outline-none focus:border-zinc-800 focus:outline-none focus:ring-0"
                />
                <span className="pointer-events-none absolute -top-7 right-2 rounded border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-[10px] text-zinc-300 opacity-0 transition group-hover:opacity-100">
                  Click to copy
                </span>
              </div>
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
            className="h-10 rounded-md border border-cyan-500/60 bg-cyan-500/10 px-4 text-sm text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-50"
          >
            {saveMutation.isPending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </main>
  );
}
