"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { saveWeighIn } from "@/app/actions/tracking";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const MEASUREMENTS = [
  ["waistNavel", "Waist (navel)"],
  ["waistNatural", "Waist (natural)"],
  ["chest", "Chest"],
  ["arm", "Arm"],
  ["thigh", "Thigh"],
  ["hips", "Hips"],
] as const;

export function WeighInForm({ today, target }: { today: string; target: number }) {
  const [state, action, pending] = useActionState(saveWeighIn, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Weigh-in saved");
  }, [state]);

  return (
    <form action={action}>
      <FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="date">Date</FieldLabel>
            <Input id="date" name="date" type="date" defaultValue={today} max={today} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="weight">Weight (lb)</FieldLabel>
            <Input id="weight" name="weight" type="number" step="0.1" inputMode="decimal" placeholder={`${target}`} />
          </Field>
        </div>
        <FieldSet>
          <FieldLegend variant="label">Measurements (in, optional)</FieldLegend>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {MEASUREMENTS.map(([name, label]) => (
              <Field key={name}>
                <FieldLabel htmlFor={name} className="text-xs font-normal text-muted-foreground">
                  {label}
                </FieldLabel>
                <Input id={name} name={name} type="number" step="0.1" inputMode="decimal" />
              </Field>
            ))}
          </div>
        </FieldSet>
        {state?.error && <FieldError>{state.error}</FieldError>}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save weigh-in"}
        </Button>
      </FieldGroup>
    </form>
  );
}
