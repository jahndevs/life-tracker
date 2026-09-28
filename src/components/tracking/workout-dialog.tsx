"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/app/actions/tracking";
import { WORKOUT_META } from "@/components/tracking/workout-type";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { WORKOUT_TYPES, type WorkoutType } from "@/lib/workouts";

export type WorkoutInput = { type: WorkoutType; protocol: string; hardLong: boolean };

export function WorkoutDialog({
  trigger,
  title,
  description,
  initial,
  onSubmit,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  initial?: WorkoutInput;
  onSubmit: (input: WorkoutInput) => Promise<ActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<WorkoutType>(initial?.type ?? "run");
  const [protocol, setProtocol] = useState(initial?.protocol ?? "");
  const [hardLong, setHardLong] = useState(initial?.hardLong ?? false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setType(initial?.type ?? "run");
      setProtocol(initial?.protocol ?? "");
      setHardLong(initial?.hardLong ?? false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await onSubmit({ type, protocol, hardLong });
      if (result.ok) setOpen(false);
      else toast.error(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <FieldGroup className="py-6">
            <Field>
              <FieldLabel htmlFor="workout-type">Type</FieldLabel>
              <Select value={type} onValueChange={(v) => setType(v as WorkoutType)}>
                <SelectTrigger id="workout-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKOUT_TYPES.map((t) => {
                    const Icon = WORKOUT_META[t].icon;
                    return (
                      <SelectItem key={t} value={t}>
                        <Icon /> {WORKOUT_META[t].label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="workout-protocol">Session</FieldLabel>
              <Input
                id="workout-protocol"
                placeholder="e.g. 3–6 mi easy (Z2)"
                value={protocol}
                onChange={(e) => setProtocol(e.target.value)}
                required
              />
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id="workout-hard"
                checked={hardLong}
                onCheckedChange={(v) => setHardLong(v === true)}
              />
              <FieldLabel htmlFor="workout-hard" className="font-normal">
                Hard or long session (fuel it)
              </FieldLabel>
            </Field>
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
