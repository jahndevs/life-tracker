"use client";

import { useOptimistic, useTransition } from "react";
import {
  setNutritionHit,
  setSupplementTakenOn,
  setWorkoutCompleted,
} from "@/app/actions/tracking";
import { OptimisticCheckbox } from "@/components/tracking/optimistic-checkbox";
import { workoutMeta } from "@/components/tracking/workout-type";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MACRO_KEYS, MACROS, type HitField } from "@/lib/adherence";
import { cn } from "@/lib/utils";

export type WeekCell = {
  date: string;
  label: string; // "Mon 28"
  isToday: boolean;
  tracked: boolean; // day exists and is on/before today
  dayLogId: string | null;
  hits: Record<HitField, boolean> | null;
  supplements: Record<string, boolean>; // supplementId -> taken
  workouts: { id: string | null; type: string; protocol: string; completed: boolean; hardLong: boolean }[];
  weight: number | null;
};

export type WeekRow = { id: string; name: string };

export function WeekGrid({ days, supplements }: { days: WeekCell[]; supplements: WeekRow[] }) {
  const tracked = days.filter((d) => d.tracked);

  const rowPct = (flags: boolean[]) =>
    flags.length === 0 ? "—" : `${Math.round((flags.filter(Boolean).length / flags.length) * 100)}%`;

  return (
    <Table className="min-w-[720px]">
      <TableHeader>
        <TableRow>
          <TableHead className="w-40" />
          {days.map((d) => (
            <TableHead
              key={d.date}
              className={cn("text-center", d.isToday && "text-primary")}
              aria-current={d.isToday ? "date" : undefined}
            >
              {d.label}
            </TableHead>
          ))}
          <TableHead className="text-right">Week</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <SectionRow label="Nutrition" />
        {MACRO_KEYS.map((key) => {
          const field = MACROS[key].hitField;
          return (
            <TableRow key={key}>
              <TableCell className="font-medium">{MACROS[key].label}</TableCell>
              {days.map((d) => (
                <GridCell key={d.date} day={d}>
                  {d.dayLogId && d.hits && (
                    <OptimisticCheckbox
                      checked={d.hits[field]}
                      onCheckedChange={(c) => setNutritionHit(d.dayLogId!, field, c)}
                      aria-label={`${MACROS[key].label} on ${d.label}`}
                    />
                  )}
                </GridCell>
              ))}
              <PctCell value={rowPct(tracked.map((d) => d.hits?.[field] ?? false))} />
            </TableRow>
          );
        })}

        <SectionRow label="Supplements" />
        {supplements.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-medium">{s.name}</TableCell>
            {days.map((d) => (
              <GridCell key={d.date} day={d}>
                {d.tracked && s.id in d.supplements && (
                  <OptimisticCheckbox
                    checked={d.supplements[s.id]}
                    onCheckedChange={(c) => setSupplementTakenOn(d.date, s.id, c)}
                    aria-label={`${s.name} on ${d.label}`}
                  />
                )}
              </GridCell>
            ))}
            <PctCell
              value={rowPct(
                tracked.filter((d) => s.id in d.supplements).map((d) => d.supplements[s.id]),
              )}
            />
          </TableRow>
        ))}

        <SectionRow label="Training" />
        <TableRow>
          <TableCell className="font-medium">Sessions</TableCell>
          {days.map((d) => (
            <TableCell key={d.date} className={cn("text-center", !d.tracked && "opacity-50")}>
              <div className="flex flex-wrap justify-center gap-1">
                {d.workouts.length === 0 && <span className="text-xs text-muted-foreground">Rest</span>}
                {d.workouts.map((w, i) => (
                  <WorkoutChip key={w.id ?? i} workout={w} interactive={d.tracked} />
                ))}
              </div>
            </TableCell>
          ))}
          <PctCell value={rowPct(tracked.flatMap((d) => d.workouts.map((w) => w.completed)))} />
        </TableRow>

        <SectionRow label="Body" />
        <TableRow>
          <TableCell className="font-medium">Weight</TableCell>
          {days.map((d) => (
            <TableCell key={d.date} className="text-center text-sm tabular">
              {d.weight ?? ""}
            </TableCell>
          ))}
          <TableCell />
        </TableRow>
      </TableBody>
    </Table>
  );
}

function SectionRow({ label }: { label: string }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={9} className="pt-5 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </TableCell>
    </TableRow>
  );
}

function GridCell({ day, children }: { day: WeekCell; children?: React.ReactNode }) {
  return (
    <TableCell className={cn("text-center", day.isToday && "bg-primary/5")}>
      <div className="flex justify-center">
        {children ?? <span className="text-muted-foreground/40">·</span>}
      </div>
    </TableCell>
  );
}

function PctCell({ value }: { value: string }) {
  return <TableCell className="text-right font-medium tabular">{value}</TableCell>;
}

function WorkoutChip({
  workout,
  interactive,
}: {
  workout: WeekCell["workouts"][number];
  interactive: boolean;
}) {
  const meta = workoutMeta(workout.type);
  const Icon = meta.icon;
  const [completed, setCompleted] = useOptimistic(workout.completed);
  const [, startTransition] = useTransition();
  const chip = (
    <span
      className={cn(
        "flex size-7 items-center justify-center rounded-md border",
        completed
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground",
        workout.hardLong && !completed && "border-primary/60",
      )}
    >
      <Icon className="size-3.5" />
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {interactive && workout.id ? (
          <button
            type="button"
            className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-pressed={completed}
            aria-label={`${meta.label}: ${workout.protocol}`}
            onClick={() =>
              startTransition(async () => {
                setCompleted(!completed);
                await setWorkoutCompleted(workout.id!, !completed);
              })
            }
          >
            {chip}
          </button>
        ) : (
          <span>{chip}</span>
        )}
      </TooltipTrigger>
      <TooltipContent>
        {meta.label} · {workout.protocol}
        {workout.hardLong && " (long)"}
      </TooltipContent>
    </Tooltip>
  );
}
