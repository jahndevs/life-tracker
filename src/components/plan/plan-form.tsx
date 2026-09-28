"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import type { PlanFormState } from "@/app/actions/plan";
import { toErrors } from "@/components/auth/errors";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type PlanDefaults = {
  raceName: string;
  raceDate: string;
  startDate: string;
  startWeight: number;
  goalWeight: number;
  weeklyLossLb: number;
};

export function PlanForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (state: PlanFormState, formData: FormData) => Promise<PlanFormState>;
  defaults: Partial<PlanDefaults>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state?.errors ?? {};

  useEffect(() => {
    if (state?.ok) toast.success("Plan saved");
  }, [state]);

  const field = (
    name: keyof PlanDefaults,
    label: string,
    props: React.ComponentProps<typeof Input>,
    description?: string,
  ) => (
    <Field data-invalid={!!errors[name]}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        name={name}
        defaultValue={defaults[name]}
        aria-invalid={!!errors[name]}
        required
        {...props}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={toErrors(errors[name])} />
    </Field>
  );

  return (
    <form action={formAction}>
      <FieldGroup>
        <div className="grid gap-6 sm:grid-cols-2">
          {field("raceName", "Race", { type: "text", placeholder: "e.g. Spring triathlon" })}
          {field("raceDate", "Race day", { type: "date" }, "Phases are planned backwards from here.")}
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {field("startDate", "Start date", { type: "date" }, "A Monday: your first weigh-in.")}
          {field("weeklyLossLb", "Weekly loss (lb)", { type: "number", step: "0.1", min: 0, max: 3, placeholder: "1.0" })}
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {field("startWeight", "Start weight (lb)", { type: "number", step: "0.1" })}
          {field("goalWeight", "Goal weight (lb)", { type: "number", step: "0.1" })}
        </div>
        {state?.message && <FieldError>{state.message}</FieldError>}
        <Field orientation="horizontal">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
