"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSource, fetchSources } from "@/lib/api/client";
import type { SourceLanguage } from "@/lib/types/sources";

type LanguageOption = {
  value: SourceLanguage;
  label: string;
  icon: JSX.Element;
};

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "JS", label: "JavaScript", icon: <JsIcon /> },
  { value: "PHP", label: "PHP", icon: <PhpIcon /> },
  { value: "GO", label: "Go", icon: <GoIcon /> },
  { value: "PYTHON", label: "Python", icon: <PythonIcon /> },
  { value: "OTHER", label: "Other", icon: <OtherIcon /> }
];

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
}

function IconWrap({ children }: { children: React.ReactNode }) {
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

export default function SourcesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<SourceLanguage>("JS");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sourcesQuery = useQuery({
    queryKey: ["sources"],
    queryFn: fetchSources
  });

  const trimmedName = useMemo(() => name.trim(), [name]);
  const canSubmit = trimmedName.length > 0 && trimmedName.length <= 255;

  const createSourceMutation = useMutation({
    mutationFn: createSource,
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
      setIsCreateOpen(false);
      setName("");
      setLanguage("JS");
      setSubmitError(null);
      router.push(`/sources/${payload.data.id}`);
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : "Failed to create source");
    }
  });

  if (sourcesQuery.isLoading) {
    return <main className="p-6 text-sm text-zinc-400">Loading sources...</main>;
  }

  if (sourcesQuery.isError || !sourcesQuery.data) {
    return (
      <main className="p-6 text-sm text-rose-300">
        Failed to load sources. Try refreshing the page.
      </main>
    );
  }

  return (
    <main className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-zinc-100">Sources</h1>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="rounded-md border border-cyan-500/60 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 transition hover:bg-cyan-500/20"
        >
          New source
        </button>
      </div>

      {sourcesQuery.data.data.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-6 text-sm text-zinc-400">
          No sources yet. Create your first source to ingest logs.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <div className="grid grid-cols-[1fr_160px_1fr_210px] border-b border-zinc-800 bg-zinc-900 px-4 py-2 text-xs uppercase tracking-wide text-zinc-400">
            <span>Name</span>
            <span>Language</span>
            <span>API Key</span>
            <span>Created</span>
          </div>
          {sourcesQuery.data.data.map((source) => (
            <button
              key={source.id}
              type="button"
              onClick={() => router.push(`/sources/${source.id}`)}
              className="grid w-full grid-cols-[1fr_160px_1fr_210px] items-center border-b border-zinc-900 px-4 py-3 text-left text-sm transition hover:bg-zinc-900/50 last:border-b-0"
            >
              <span className="text-zinc-100">{source.name}</span>
              <span className="text-zinc-300">{source.language}</span>
              <span className="truncate font-mono text-xs text-zinc-400">{source.apiKey}</span>
              <span className="text-zinc-400">{formatDateTime(source.createdAt)}</span>
            </button>
          ))}
        </div>
      )}

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4">
          <div className="w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-100">Create new source</h2>
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  setSubmitError(null);
                }}
                className="rounded-md px-2 py-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="source-name" className="text-xs uppercase tracking-wide text-zinc-500">
                  Name
                </label>
                <input
                  id="source-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. checkout-api"
                  className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none ring-cyan-500 focus:ring-2"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Programming language</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {LANGUAGE_OPTIONS.map((option) => {
                    const isSelected = language === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setLanguage(option.value)}
                        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
                          isSelected
                            ? "border-cyan-500 bg-cyan-500/10 text-cyan-200"
                            : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
                        }`}
                      >
                        {option.icon}
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {submitError ? <p className="text-sm text-rose-300">{submitError}</p> : null}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canSubmit || createSourceMutation.isPending}
                  onClick={() => {
                    setSubmitError(null);
                    void createSourceMutation.mutateAsync({
                      name: trimmedName,
                      language
                    });
                  }}
                  className="rounded-md border border-cyan-500/60 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createSourceMutation.isPending ? "Creating..." : "Create source"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
