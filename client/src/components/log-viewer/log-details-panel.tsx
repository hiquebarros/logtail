"use client";

import { useMemo } from "react";
import type { Log } from "@/lib/types/logs";

type Props = {
  log: Log | null;
  onClose: () => void;
};

export function LogDetailsPanel({ log, onClose }: Props) {
  const prettyJson = useMemo(
    () => (log ? JSON.stringify(log, null, 2) : ""),
    [log],
  );

  return (
    <aside className="w-[420px] border-l border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-100">Log details</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Close
        </button>
      </div>

      {!log ? (
        <div className="p-4 text-sm text-zinc-500">Select a log to inspect fields.</div>
      ) : (
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Detail label="timestamp" value={log.timestamp} />
            <Detail label="level" value={log.level} highlight />
            <Detail label="service" value={log.service} />
            <Detail label="environment" value={log.environment} />
          </div>

          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Message
            </h3>
            <p className="rounded border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100">
              {log.message}
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Metadata
            </h3>
            <div className="max-h-52 overflow-auto rounded border border-zinc-800 bg-zinc-900">
              {Object.entries(log.metadata).map(([key, value]) => (
                <div
                  key={key}
                  className="grid grid-cols-[1fr_2fr] gap-2 border-b border-zinc-800 px-3 py-2 text-xs last:border-b-0"
                >
                  <span className="font-mono text-zinc-400">{key}</span>
                  <span className="truncate text-zinc-200">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Full JSON
              </h3>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(prettyJson)}
                className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                Copy
              </button>
            </div>
            <pre className="max-h-72 overflow-auto rounded border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-300">
              {prettyJson}
            </pre>
          </div>
        </div>
      )}
    </aside>
  );
}

function Detail({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900 p-2">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`truncate pt-1 text-xs ${highlight ? "text-cyan-300" : "text-zinc-200"}`}>
        {value}
      </div>
    </div>
  );
}
