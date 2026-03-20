"use client";

type Props = {
  onSearchOneMoreDay: () => void;
  onSearchEverything: () => void;
};

export function LogEmptyState({ onSearchOneMoreDay, onSearchEverything }: Props) {
  return (
    <div className="mx-auto flex min-h-64 w-full max-w-[400px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 shadow-sm">
        <div className="h-5 w-5 rounded-full border-2 border-cyan-400/70" />
      </div>
      <h4 className="mb-3 text-lg font-semibold text-zinc-100">No matching logs found</h4>
      <p className="mb-4 text-sm leading-5 text-zinc-400">
        Try searching using a more generic search condition or broadening the time frame of
        the query.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onSearchOneMoreDay}
          className="h-8 rounded border border-zinc-600 bg-zinc-900 px-3 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800"
        >
          Search 1 more day
        </button>
        <button
          type="button"
          onClick={onSearchEverything}
          className="h-8 rounded border border-zinc-600 bg-zinc-900 px-3 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800"
        >
          Search everything
        </button>
      </div>
    </div>
  );
}
