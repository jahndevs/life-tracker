"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTransition } from "react";
import {
  addWorkoutTemplate,
  deleteWorkoutTemplate,
  updateWorkoutTemplate,
} from "@/app/actions/plan";
import { WorkoutDialog } from "@/components/tracking/workout-dialog";
import { workoutMeta } from "@/components/tracking/workout-type";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WEEKDAY_NAMES } from "@/lib/dates";
import type { WorkoutType } from "@/lib/workouts";

type Template = { id: string; weekday: number; type: string; protocol: string; hardLong: boolean };

export function WeekTemplateEditor({ templates }: { templates: Template[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {WEEKDAY_NAMES.map((name, weekday) => {
        const sessions = templates.filter((t) => t.weekday === weekday);
        return (
          <div key={name} className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{name}</span>
              <WorkoutDialog
                title={`Add to ${name}`}
                description="Future days pick this up; past days stay as logged."
                onSubmit={(input) => addWorkoutTemplate({ weekday, ...input })}
                trigger={
                  <Button size="icon-xs" variant="ghost" aria-label={`Add session on ${name}`}>
                    <PlusIcon />
                  </Button>
                }
              />
            </div>
            {sessions.length === 0 && <span className="text-xs text-muted-foreground">Rest</span>}
            {sessions.map((t) => (
              <TemplateRow key={t.id} template={t} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function TemplateRow({ template }: { template: Template }) {
  const [pending, startTransition] = useTransition();
  const meta = workoutMeta(template.type);
  const Icon = meta.icon;

  return (
    <div className="group flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <span className="font-medium">{meta.label}</span>{" "}
        <span className="text-muted-foreground">{template.protocol}</span>
        {template.hardLong && (
          <Badge variant="outline" className="ml-1">
            Long
          </Badge>
        )}
      </div>
      <div className="flex opacity-60 group-hover:opacity-100 focus-within:opacity-100">
        <WorkoutDialog
          title="Edit session"
          initial={{
            type: template.type as WorkoutType,
            protocol: template.protocol,
            hardLong: template.hardLong,
          }}
          onSubmit={(input) => updateWorkoutTemplate(template.id, input)}
          trigger={
            <Button size="icon-xs" variant="ghost" aria-label="Edit session">
              <PencilIcon />
            </Button>
          }
        />
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="Delete session"
          disabled={pending}
          onClick={() => startTransition(() => deleteWorkoutTemplate(template.id))}
        >
          <Trash2Icon />
        </Button>
      </div>
    </div>
  );
}
