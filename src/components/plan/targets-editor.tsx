"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveTargets } from "@/app/actions/plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MACRO_KEYS, MACROS, type MacroKey } from "@/lib/adherence";
import { PHASE_INFO, type PhaseKey } from "@/lib/phases";

type Targets = Record<MacroKey, number> | null;

export function TargetsEditor({
  targets,
  currentPhase,
}: {
  targets: Record<PhaseKey, Targets>;
  currentPhase: PhaseKey | null;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Phase</TableHead>
          {MACRO_KEYS.map((k) => (
            <TableHead key={k} className="text-right">
              {MACROS[k].label} <span className="font-normal text-muted-foreground">({MACROS[k].unit})</span>
            </TableHead>
          ))}
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {(Object.keys(targets) as PhaseKey[]).map((phase) => (
          <TargetRow key={phase} phase={phase} initial={targets[phase]} current={phase === currentPhase} />
        ))}
      </TableBody>
    </Table>
  );
}

function TargetRow({ phase, initial, current }: { phase: PhaseKey; initial: Targets; current: boolean }) {
  const saved = (k: MacroKey) => (initial ? String(initial[k]) : "");
  const [values, setValues] = useState(
    () => Object.fromEntries(MACRO_KEYS.map((k) => [k, saved(k)])) as Record<MacroKey, string>,
  );
  const [pending, startTransition] = useTransition();
  const dirty = MACRO_KEYS.some((k) => values[k] !== saved(k));

  function save() {
    startTransition(async () => {
      const result = await saveTargets({ phase, ...values });
      if (result.ok) toast.success(`${PHASE_INFO[phase].name} targets saved`);
      else toast.error(result.error);
    });
  }

  return (
    <TableRow>
      <TableCell className="font-medium whitespace-nowrap">
        {PHASE_INFO[phase].name}
        {current && <span className="ml-2 text-xs text-primary">now</span>}
      </TableCell>
      {MACRO_KEYS.map((k) => (
        <TableCell key={k} className="text-right">
          <Input
            inputMode="numeric"
            className="ml-auto h-8 w-20 text-right tabular"
            placeholder="—"
            value={values[k]}
            onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value.replace(/\D/g, "") }))}
            aria-label={`${PHASE_INFO[phase].name} ${MACROS[k].label}`}
          />
        </TableCell>
      ))}
      <TableCell className="text-right">
        <Button size="sm" variant={dirty ? "default" : "ghost"} disabled={!dirty || pending} onClick={save}>
          Save
        </Button>
      </TableCell>
    </TableRow>
  );
}
