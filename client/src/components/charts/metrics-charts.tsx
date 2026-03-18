"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricsResponse } from "@/lib/types/metrics";

export function MetricsCharts({ data }: { data: MetricsResponse }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard title="Logs per minute">
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={data.logsPerMinute}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              stroke="#71717a"
              fontSize={11}
              tickFormatter={(value: string) =>
                new Date(value).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              }
            />
            <YAxis stroke="#71717a" fontSize={11} />
            <Tooltip
              contentStyle={{ background: "#0a0a0a", border: "1px solid #27272a" }}
              labelStyle={{ color: "#d4d4d8" }}
            />
            <Line
              type="monotone"
              dataKey="logs"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Error rate">
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={data.logsPerMinute}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              stroke="#71717a"
              fontSize={11}
              tickFormatter={(value: string) =>
                new Date(value).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              }
            />
            <YAxis stroke="#71717a" fontSize={11} />
            <Tooltip
              contentStyle={{ background: "#0a0a0a", border: "1px solid #27272a" }}
              formatter={(value) => {
                const numeric = typeof value === "number" ? value : Number(value ?? 0);
                return [`${(numeric * 100).toFixed(1)}%`, "Error rate"];
              }}
            />
            <Line
              type="monotone"
              dataKey="errorRate"
              stroke="#f43f5e"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top services">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.topServices} layout="vertical">
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis type="number" stroke="#71717a" fontSize={11} />
            <YAxis type="category" dataKey="service" stroke="#71717a" fontSize={11} />
            <Tooltip
              contentStyle={{ background: "#0a0a0a", border: "1px solid #27272a" }}
            />
            <Bar dataKey="count" fill="#22d3ee" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <h3 className="mb-3 text-sm font-medium text-zinc-100">{title}</h3>
      {children}
    </div>
  );
}
