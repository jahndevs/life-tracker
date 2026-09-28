"use client";

import { ChevronDownIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  addWorkout,
  deleteWorkout,
  saveWorkoutDetails,
  setWorkoutCompleted,
} from "@/app/actions/tracking";
import { OptimisticCheckbox } from "@/components/tracking/optimistic-checkbox";
import { WorkoutDialog } from "@/components/tracking/workout-dialog";
import { workoutMeta } from "@/components/tracking/workout-type";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Workout = {
  id: string;
  type: string;
  protocol: string | null;
  hardLong: boolean;
  completed: boolean;
  distance: number | null;
  duration: number | null;
  notes: string | null;
};

export function WorkoutsCard({ date, workouts }: { date: string; workouts: Workout[] }) {
  const done = workouts.filter((w) => w.completed).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training</CardTitle>
        <CardDescription>
          {workouts.length === 0 ? (
            <>
              Nothing planned. Build your week on{" "}
              <Link href="/plan#training" className="underline">
                Plan
              </Link>
              .
            </>
          ) : (
            "Today's sessions from your plan."
          )}
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          {workouts.length > 0 && (
            <Badge variant={done === workouts.length ? "default" : "secondary"} className="tabular">
              {done}/{workouts.length}
            </Badge>
          )}
          <WorkoutDialog
            title="Add a session"
            description="Extra or swapped work for this day."
            onSubmit={(input) => addWorkout(date, input)}
            trigger={
              <Button size="icon-sm" variant="ghost" aria-label="Add session">
                <PlusIcon />
              </Button>
            }
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y">
          {workouts.map((w) => (
            <WorkoutRow key={w.id} workout={w} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function WorkoutRow({ workout }: { workout: Workout }) {
  const [open, setOpen] = useState(false);
  const meta = workoutMeta(workout.type);
  const Icon = meta.icon;
  const summary = [
    workout.distance != null && `${workout.distance} ${meta.unit}`.trim(),
    workout.duration != null && `${workout.duration} min`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <OptimisticCheckbox
          id={`workout-${workout.id}`}
          checked={workout.completed}
          onCheckedChange={(checked) => setWorkoutCompleted(workout.id, checked)}
        />
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <label htmlFor={`workout-${workout.id}`} className="min-w-0 flex-1">
          <span className="text-sm font-medium">{meta.label}</span>
          <span className="text-sm text-muted-foreground"> · {workout.protocol}</span>
          {summary && <span className="block text-xs text-muted-foreground tabular">{summary}</span>}
        </label>
        {workout.hardLong && <Badge variant="outline">Long</Badge>}
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Session details"
        >
          <ChevronDownIcon className={cn("transition-transform", open && "rotate-180")} />
        </Button>
      </div>
      {open && <WorkoutDetails workout={workout} unit={meta.unit} onDone={() => setOpen(false)} />}
    </li>
  );
}

function WorkoutDetails({
  workout,
  unit,
  onDone,
}: {
  workout: Workout;
  unit: string;
  onDone: () => void;
}) {
  const [distance, setDistance] = useState(workout.distance?.toString() ?? "");
  const [duration, setDuration] = useState(workout.duration?.toString() ?? "");
  const [notes, setNotes] = useState(workout.notes ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await saveWorkoutDetails(workout.id, { distance, duration, notes });
      if (result.ok) onDone();
      else toast.error(result.error);
    });
  }

  function remove() {
    startTransition(async () => {
      await deleteWorkout(workout.id);
    });
  }

  return (
    <div className="mt-3 ml-7 grid gap-3 rounded-lg bg-muted/40 p-3">
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor={`dist-${workout.id}`}>Distance{unit && ` (${unit})`}</FieldLabel>
          <Input
            id={`dist-${workout.id}`}
            inputMode="decimal"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`dur-${workout.id}`}>Duration (min)</FieldLabel>
          <Input
            id={`dur-${workout.id}`}
            inputMode="numeric"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor={`notes-${workout.id}`}>Notes</FieldLabel>
        <Textarea
          id={`notes-${workout.id}`}
          rows={2}
          placeholder="How did it feel? HR, pace, fueling…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      <div className="flex justify-between">
        <Button variant="ghost" size="sm" onClick={remove} disabled={pending} className="text-destructive">
          <Trash2Icon /> Remove
        </Button>
        <Button size="sm" onClick={save} disabled={pending}>
          Save
        </Button>
      </div>
    </div>
  );
}
