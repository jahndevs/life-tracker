import { formatShort, WEEKDAY_LABELS } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Day = { date: string; done: number; total: number; future: boolean };

const STEPS = ["bg-muted", "bg-primary/25", "bg-primary/50", "bg-primary/75", "bg-primary"];

function step(day: Day) {
  if (day.total === 0) return null;
  const share = day.done / day.total;
  if (share === 0) return 0;
  if (share === 1) return 4;
  return share < 0.34 ? 1 : share < 0.67 ? 2 : 3;
}

export function ConsistencyHeatmap({ days }: { days: Day[] }) {
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, w) => days.slice(w * 7, w * 7 + 7));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 overflow-x-auto">
        <div className="grid grid-rows-7 gap-1 pr-1 text-[10px] leading-3 text-muted-foreground">
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={label} className="h-3.5">
              {i % 2 === 0 ? label : ""}
            </span>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0].date} className="grid grid-rows-7 gap-1">
            {week.map((day) => {
              const s = step(day);
              const label = day.future
                ? formatShort(day.date)
                : day.total === 0
                  ? `${formatShort(day.date)}: nothing scheduled`
                  : `${formatShort(day.date)}: ${day.done} of ${day.total} done`;
              return (
                <span
                  key={day.date}
                  title={label}
                  aria-label={label}
                  className={cn(
                    "size-3.5 rounded-[3px]",
                    day.future ? "bg-transparent" : s === null ? "bg-muted/40" : STEPS[s],
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        Less
        {STEPS.map((c) => (
          <span key={c} className={cn("size-3 rounded-[3px]", c)} />
        ))}
        More
      </div>
    </div>
  );
}
