type Props = {
  label: string;
  value: number;
  tone?: "default" | "danger" | "warning";
};

const toneClass: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-zinc-100",
  danger: "text-rose-300",
  warning: "text-amber-300",
};

export function KpiCard({ label, value, tone = "default" }: Props) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`pt-2 text-2xl font-semibold ${toneClass[tone]}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}
