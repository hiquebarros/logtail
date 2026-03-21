"use client";

import { useEffect, useMemo, useState } from "react";
import type { LogFilters } from "@/lib/types/logs";
import { buildRelativeTimeRange, microsStringToMs, msToMicrosString } from "@/lib/utils/time-range";

type TimeRangePickerProps = {
  filters: LogFilters;
  onChange: (next: LogFilters) => void;
};

type RangeOption = {
  label: string;
  value: string;
  minutes: number;
};

const RANGE_OPTIONS: RangeOption[] = [
  { label: "Last 5 minutes", value: "5m", minutes: 5 },
  { label: "Last 15 minutes", value: "15m", minutes: 15 },
  { label: "Last 1 hour", value: "1h", minutes: 60 },
  { label: "Last 2 hours", value: "2h", minutes: 2 * 60 },
  { label: "Last 6 hours", value: "6h", minutes: 6 * 60 },
  { label: "Last 12 hours", value: "12h", minutes: 12 * 60 },
  { label: "Last 24 hours", value: "24h", minutes: 24 * 60 },
  { label: "Last 7 days", value: "7d", minutes: 7 * 24 * 60 },
  { label: "Last 30 days", value: "30d", minutes: 30 * 24 * 60 },
];

const ZERO_BIGINT = BigInt(0);
const MICROSECONDS_IN_MINUTE = BigInt(60) * BigInt(1_000_000);

function getSelectedPresetValue(filters: LogFilters): string | null {
  try {
    const rf = BigInt(filters.timeRange.rf);
    const rt = BigInt(filters.timeRange.rt);
    const diff = rt - rf;
    if (diff <= ZERO_BIGINT || diff % MICROSECONDS_IN_MINUTE !== ZERO_BIGINT) {
      return null;
    }
    const minutes = Number(diff / MICROSECONDS_IN_MINUTE);
    const matched = RANGE_OPTIONS.find((option) => option.minutes === minutes);
    return matched?.value ?? null;
  } catch {
    return null;
  }
}

function toLocalInputValue(ms: number): string {
  const date = new Date(ms);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toMsFromInputValue(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function formatCustomRangeLabel(filters: LogFilters): string {
  try {
    const fromMs = microsStringToMs(filters.timeRange.rf);
    const toMs = microsStringToMs(filters.timeRange.rt);
    const from = new Date(fromMs);
    const to = new Date(toMs);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) {
      return "Custom";
    }

    const formatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${formatter.format(from)} - ${formatter.format(to)}`;
  } catch {
    return "Custom";
  }
}

export function TimeRangePicker({ filters, onChange }: TimeRangePickerProps) {
  const selectedPresetValue = useMemo(() => getSelectedPresetValue(filters), [filters]);
  const currentLabel =
    selectedPresetValue !== null
      ? (RANGE_OPTIONS.find((option) => option.value === selectedPresetValue)?.label ?? "Relative")
      : formatCustomRangeLabel(filters);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"relative" | "custom">(selectedPresetValue ? "relative" : "custom");
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);

  const syncFromFilters = () => {
    try {
      const fromMs = microsStringToMs(filters.timeRange.rf);
      const toMs = microsStringToMs(filters.timeRange.rt);
      setFromInput(toLocalInputValue(fromMs));
      setToInput(toLocalInputValue(toMs));
    } catch {
      const nowMs = Date.now();
      setFromInput(toLocalInputValue(nowMs - 60 * 60 * 1000));
      setToInput(toLocalInputValue(nowMs));
    }
    setCustomError(null);
  };

  const openModal = () => {
    setMode(selectedPresetValue ? "relative" : "custom");
    syncFromFilters();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const applyRelative = (option: RangeOption) => {
    onChange({
      ...filters,
      timeRange: buildRelativeTimeRange(option.minutes),
    });
    setIsOpen(false);
  };

  const applyCustom = () => {
    const fromMs = toMsFromInputValue(fromInput);
    const toMs = toMsFromInputValue(toInput);

    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
      setCustomError("Please provide valid start and end dates.");
      return;
    }
    if (fromMs >= toMs) {
      setCustomError("Start date must be before end date.");
      return;
    }

    onChange({
      ...filters,
      timeRange: {
        rf: msToMicrosString(fromMs),
        rt: msToMicrosString(toMs),
      },
    });
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex h-9 min-w-[170px] items-center justify-between rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none ring-cyan-500 transition hover:bg-zinc-800 focus:ring-2"
      >
        <span className="truncate">{currentLabel}</span>
        <span className="ml-3 text-xs text-zinc-400">▼</span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="absolute inset-0"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-2xl rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-100">Time Range</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                Close
              </button>
            </div>

            <div className="grid gap-0 sm:grid-cols-[190px_1fr]">
              <div className="border-b border-zinc-700 p-3 sm:border-b-0 sm:border-r">
                <button
                  type="button"
                  onClick={() => setMode("relative")}
                  className={`mb-2 w-full rounded px-3 py-2 text-left text-sm transition ${
                    mode === "relative"
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-300 hover:bg-zinc-800/70"
                  }`}
                >
                  Relative
                </button>
                <button
                  type="button"
                  onClick={() => setMode("custom")}
                  className={`w-full rounded px-3 py-2 text-left text-sm transition ${
                    mode === "custom"
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-300 hover:bg-zinc-800/70"
                  }`}
                >
                  Custom
                </button>
              </div>

              <div className="p-4">
                {mode === "relative" ? (
                  <div>
                    <p className="mb-3 text-xs text-zinc-400">Choose a relative range</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {RANGE_OPTIONS.map((option) => {
                        const isSelected = option.value === selectedPresetValue;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => applyRelative(option)}
                            className={`rounded border px-3 py-2 text-left text-sm transition ${
                              isSelected
                                ? "border-cyan-500/60 bg-cyan-600/20 text-cyan-200"
                                : "border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="mb-3 text-xs text-zinc-400">
                      Set start and end dates manually, or click a chart bucket to define a custom
                      range automatically.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-xs text-zinc-400">
                        From
                        <input
                          type="datetime-local"
                          value={fromInput}
                          onChange={(event) => {
                            setFromInput(event.target.value);
                            setCustomError(null);
                          }}
                          className="mt-1 h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100 outline-none ring-cyan-500 focus:ring-2"
                        />
                      </label>
                      <label className="text-xs text-zinc-400">
                        To
                        <input
                          type="datetime-local"
                          value={toInput}
                          onChange={(event) => {
                            setToInput(event.target.value);
                            setCustomError(null);
                          }}
                          className="mt-1 h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100 outline-none ring-cyan-500 focus:ring-2"
                        />
                      </label>
                    </div>
                    {customError ? <p className="mt-2 text-xs text-red-400">{customError}</p> : null}
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="h-9 rounded-md border border-zinc-700 px-3 text-sm text-zinc-200 transition hover:bg-zinc-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={applyCustom}
                        className="h-9 rounded-md border border-cyan-500/60 bg-cyan-600/20 px-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-600/30"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
