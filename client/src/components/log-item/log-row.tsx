"use client";

import type { Log } from "@/lib/types/logs";

type Props = {
  log: Log;
  selected: boolean;
  onClick: () => void;
};

const levelClassName: Record<Log["level"], string> = {
  info: "text-sky-300 bg-sky-500/10 border-sky-500/30",
  warn: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  error: "text-rose-300 bg-rose-500/10 border-rose-500/30",
};

export function LogRow({ log, selected, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid w-full grid-cols-[190px_90px_1fr_120px_220px] items-center gap-3 border-b border-zinc-900 px-3 py-2 text-left text-xs transition hover:bg-zinc-900 ${
        selected ? "bg-zinc-900/90" : "bg-transparent"
      }`}
    >
      <span className="font-mono text-zinc-400">
        {new Date(log.timestamp).toLocaleTimeString()}
      </span>
      <span
        className={`inline-flex w-fit rounded border px-1.5 py-0.5 font-semibold uppercase ${levelClassName[log.level]}`}
      >
        {log.level}
      </span>
      <span className="truncate text-zinc-100">{log.message}</span>
      <span className="truncate text-zinc-300">{log.service}</span>
      <span className="truncate text-zinc-500">{JSON.stringify(log.metadata)}</span>
    </button>
  );
}
