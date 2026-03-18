"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMetrics } from "@/lib/api/client";

export default function ServicesPage() {
  const rangeMinutes = 60;
  const metricsQuery = useQuery({
    queryKey: ["services", rangeMinutes],
    queryFn: () => fetchMetrics(rangeMinutes),
    refetchInterval: 15_000,
  });

  if (metricsQuery.isLoading) {
    return <main className="p-6 text-sm text-zinc-400">Loading services...</main>;
  }

  if (metricsQuery.isError || !metricsQuery.data) {
    return (
      <main className="p-6 text-sm text-rose-300">
        Failed to load services. Try refreshing the page.
      </main>
    );
  }

  return (
    <main className="space-y-4 p-4">
      <h1 className="text-lg font-semibold text-zinc-100">Services</h1>
      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <div className="grid grid-cols-[1fr_120px] border-b border-zinc-800 bg-zinc-900 px-4 py-2 text-xs uppercase tracking-wide text-zinc-400">
          <span>Service</span>
          <span>Logs</span>
        </div>
        {metricsQuery.data.topServices.map((service) => (
          <div
            key={service.service}
            className="grid grid-cols-[1fr_120px] border-b border-zinc-900 px-4 py-3 text-sm last:border-b-0"
          >
            <span className="text-zinc-200">{service.service}</span>
            <span className="text-zinc-400">{service.count}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
