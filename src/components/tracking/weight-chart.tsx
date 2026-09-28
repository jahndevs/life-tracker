"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatDate } from "@/lib/dates";

export type WeightPoint = {
  x: number; // days since plan start, so spacing is true to time
  date: string;
  target: number;
  actual: number | null;
};

const config = {
  actual: { label: "Actual", color: "var(--chart-1)" },
  target: { label: "Target", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function WeightChart({ data }: { data: WeightPoint[] }) {
  const values = data.flatMap((d) => (d.actual == null ? [d.target] : [d.target, d.actual]));
  const min = Math.floor(Math.min(...values) - 2);
  const max = Math.ceil(Math.max(...values) + 2);
  const byX = new Map(data.map((d) => [d.x, d.date]));
  const label = (x: number) => {
    const date = byX.get(x);
    return date ? formatDate(date, { month: "short", day: "numeric" }) : "";
  };

  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="x"
          type="number"
          domain={["dataMin", "dataMax"]}
          ticks={data.filter((_, i) => i % Math.ceil(data.length / 8) === 0).map((d) => d.x)}
          tickFormatter={label}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          domain={[min, max]}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v) => `${v}`}
          allowDecimals={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const date = payload?.[0]?.payload?.date as string | undefined;
                return date ? formatDate(date, { weekday: "short", month: "short", day: "numeric" }) : "";
              }}
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-muted-foreground">{config[name as keyof typeof config]?.label}</span>
                  <span className="font-medium text-foreground tabular">{Number(value).toFixed(1)} lb</span>
                </div>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          dataKey="target"
          type="stepAfter"
          stroke="var(--color-target)"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          isAnimationActive={false}
        />
        <Line
          dataKey="actual"
          type="monotone"
          stroke="var(--color-actual)"
          strokeWidth={2}
          connectNulls
          dot={{ r: 4, fill: "var(--color-actual)", stroke: "var(--card)", strokeWidth: 2 }}
          activeDot={{ r: 6, stroke: "var(--card)", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
