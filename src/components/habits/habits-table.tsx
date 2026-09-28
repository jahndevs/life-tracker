"use client";

import { ArchiveIcon, FlameIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteHabit, setHabitArchived, setHabitDone, updateHabit } from "@/app/actions/habits";
import { HabitDialog } from "@/components/habits/habit-dialog";
import { OptimisticCheckbox } from "@/components/tracking/optimistic-checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type HabitRow = {
  id: string;
  name: string;
  cadence: string;
  days: number;
  cadenceLabel: string;
  cells: { date: string; scheduled: boolean; done: boolean }[];
  streak: number;
  best: number;
  rate: number | null;
};

export function HabitsTable({
  habits,
  columns,
}: {
  habits: HabitRow[];
  columns: { date: string; label: string; isToday: boolean }[];
}) {
  return (
    <Table className="min-w-[640px]">
      <TableHeader>
        <TableRow>
          <TableHead>Habit</TableHead>
          {columns.map((c) => (
            <TableHead key={c.date} className={cn("text-center", c.isToday && "text-primary")}>
              {c.label}
            </TableHead>
          ))}
          <TableHead className="text-right">Streak</TableHead>
          <TableHead className="text-right">Best</TableHead>
          <TableHead className="text-right">30 days</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {habits.map((h) => (
          <TableRow key={h.id}>
            <TableCell>
              <div className="font-medium">{h.name}</div>
              <div className="text-xs text-muted-foreground">{h.cadenceLabel}</div>
            </TableCell>
            {h.cells.map((c, i) => (
              <TableCell key={c.date} className={cn("text-center", columns[i].isToday && "bg-primary/5")}>
                <div className="flex justify-center">
                  <OptimisticCheckbox
                    checked={c.done}
                    onCheckedChange={(done) => setHabitDone(h.id, c.date, done)}
                    aria-label={`${h.name} on ${columns[i].label}`}
                    className={cn(!c.scheduled && !c.done && "opacity-30")}
                  />
                </div>
              </TableCell>
            ))}
            <TableCell className="text-right tabular">
              <span className="inline-flex items-center gap-1">
                {h.streak > 0 && <FlameIcon className="size-3.5 text-orange-500" />}
                {h.streak}
              </span>
            </TableCell>
            <TableCell className="text-right text-muted-foreground tabular">{h.best}</TableCell>
            <TableCell className="text-right font-medium tabular">{h.rate === null ? "—" : `${h.rate}%`}</TableCell>
            <TableCell className="text-right">
              <HabitMenu habit={h} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function HabitMenu({ habit }: { habit: HabitRow }) {
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label={`${habit.name} options`}>
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <PencilIcon /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => startTransition(() => setHabitArchived(habit.id, true))}>
            <ArchiveIcon /> Archive
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              if (confirm(`Delete "${habit.name}" and its history?`)) {
                startTransition(() => deleteHabit(habit.id));
              }
            }}
          >
            <Trash2Icon /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <HabitDialog
        title="Edit habit"
        open={editing}
        onOpenChange={setEditing}
        initial={{ name: habit.name, cadence: habit.cadence, days: habit.days }}
        onSubmit={(input) => updateHabit(habit.id, input)}
      />
    </>
  );
}
