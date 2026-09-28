"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const config = { books: { label: "Books", color: "var(--chart-1)" } } satisfies ChartConfig;

export function BooksChart({ perMonth }: { perMonth: number[] }) {
  const data = perMonth.map((books, i) => ({ month: MONTHS[i], books }));
  const max = Math.max(2, ...perMonth);

  return (
    <ChartContainer config={config} className="aspect-auto h-48 w-full">
      <BarChart data={data} margin={{ top: 8, right: 0, left: -24, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} domain={[0, max]} tickLine={false} axisLine={false} width={40} />
        <ChartTooltip cursor={{ fillOpacity: 0.4 }} content={<ChartTooltipContent hideIndicator />} />
        <Bar dataKey="books" fill="var(--color-books)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  );
}
