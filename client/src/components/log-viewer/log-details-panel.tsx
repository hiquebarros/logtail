"use client";

import { useMemo } from "react";
import type { Log } from "@/lib/types/logs";

type Props = {
  log: Log;
  onClose: () => void;
};

export function LogDetailsPanel({ log, onClose }: Props) {
  const prettyJson = useMemo(() => JSON.stringify(log, null, 2), [log]);

  return (
    <aside className="w-[560px] border-l border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-100">Log details</h2>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Close
        </button>
      </div>

      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Full JSON
          </h3>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(prettyJson)}
            className="cursor-pointer rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Copy
          </button>
        </div>
        <pre className="max-h-[calc(100vh-180px)] overflow-auto rounded border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-300">
          {prettyJson}
        </pre>
      </div>
    </aside>
  );
}
