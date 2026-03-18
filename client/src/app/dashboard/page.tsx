"use client";

import { useQuery } from "@tanstack/react-query";
import { KpiCard } from "@/components/charts/kpi-card";
import { MetricsCharts } from "@/components/charts/metrics-charts";
import { fetchMetrics } from "@/lib/api/client";

export default function DashboardPage() {
  const rangeMinutes = 60;
  const metricsQuery = useQuery({
    queryKey: ["metrics", rangeMinutes],
    queryFn: () => fetchMetrics(rangeMinutes),
    refetchInterval: 15_000,
  });

  if (metricsQuery.isLoading) {
    return <main className="p-6 text-sm text-zinc-400">Loading metrics...</main>;
  }

  if (metricsQuery.isError || !metricsQuery.data) {
    return (
      <main className="p-6 text-sm text-rose-300">
        Failed to load metrics. Try refreshing the page.
      </main>
    );
  }

  const metrics = metricsQuery.data;

  return (
    <main className="space-y-4 bg-zinc-950 p-4 text-zinc-100">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard label="Total logs" value={metrics.totalLogs} />
        <KpiCard label="Errors" value={metrics.totalErrors} tone="danger" />
        <KpiCard label="Warnings" value={metrics.totalWarnings} tone="warning" />
      </div>
      <MetricsCharts data={metrics} />
    </main>
  );
}
