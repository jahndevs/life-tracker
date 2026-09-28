"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { HabitInput } from "@/app/actions/habits";
import type { ActionResult } from "@/app/actions/tracking";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WEEKDAY_LABELS } from "@/lib/dates";
import { ALL_DAYS } from "@/lib/habits";
import { cn } from "@/lib/utils";

export function HabitDialog({
  trigger,
  title,
  initial,
  onSubmit,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  title: string;
  initial?: HabitInput;
  onSubmit: (input: HabitInput) => Promise<ActionResult>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initial?.name ?? "");
  const [cadence, setCadence] = useState(initial?.cadence ?? "daily");
  const [days, setDays] = useState(initial?.days ?? ALL_DAYS);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setName(initial?.name ?? "");
      setCadence(initial?.cadence ?? "daily");
      setDays(initial?.days ?? ALL_DAYS);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await onSubmit({ name, cadence, days });
      if (result.ok) setOpen(false);
      else toast.error(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Streaks only count the days you schedule.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-6">
            <Field>
              <FieldLabel htmlFor="habit-name">Habit</FieldLabel>
              <Input
                id="habit-name"
                placeholder="e.g. Read 20 pages"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="habit-cadence">How often</FieldLabel>
              <Select value={cadence} onValueChange={setCadence}>
                <SelectTrigger id="habit-cadence" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Every day</SelectItem>
                  <SelectItem value="weekdays">Weekdays</SelectItem>
                  <SelectItem value="custom">Specific days</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {cadence === "custom" && (
              <div role="group" aria-label="Days" className="flex gap-1">
                {WEEKDAY_LABELS.map((label, i) => {
                  const on = ((days >> i) & 1) === 1;
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setDays(days ^ (1 << i))}
                      className={cn(
                        "h-9 flex-1 rounded-md border text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
