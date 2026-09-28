"use client";

import { InfoIcon, ZapIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setNutritionAmount, setNutritionHit } from "@/app/actions/tracking";
import { OptimisticCheckbox } from "@/components/tracking/optimistic-checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MACRO_KEYS, MACROS, type HitField, type MacroKey } from "@/lib/adherence";

type Nutrition = Record<MacroKey, number | null> & Record<HitField, boolean>;

export function NutritionCard({
  dayLogId,
  nutrition,
  targets,
  longSession,
}: {
  dayLogId: string;
  nutrition: Nutrition;
  targets: Record<MacroKey, number> | null;
  longSession: boolean;
}) {
  const hits = MACRO_KEYS.filter((k) => nutrition[MACROS[k].hitField]).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nutrition</CardTitle>
        <CardDescription>
          {targets ? (
            "Check it off, or log the number and it grades itself."
          ) : (
            <>
              No targets for this phase yet.{" "}
              <Link href="/plan#targets" className="underline">
                Set them on Plan
              </Link>
              .
            </>
          )}
        </CardDescription>
        <CardAction>
          <Badge variant={hits === MACRO_KEYS.length ? "default" : "secondary"} className="tabular">
            {hits}/{MACRO_KEYS.length}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {longSession && (
          <div className="flex gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm">
            <ZapIcon className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              Long session today. Fuel it: an extra 300–500 kcal, mostly carbs, around the
              workout. The deficit can wait until tomorrow.
            </p>
          </div>
        )}
        {MACRO_KEYS.map((key) => (
          <MacroRow
            key={key}
            dayLogId={dayLogId}
            macro={key}
            amount={nutrition[key]}
            hit={nutrition[MACROS[key].hitField]}
            target={targets?.[key] ?? null}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function MacroRow({
  dayLogId,
  macro,
  amount,
  hit,
  target,
}: {
  dayLogId: string;
  macro: MacroKey;
  amount: number | null;
  hit: boolean;
  target: number | null;
}) {
  const info = MACROS[macro];
  const [value, setValue] = useState(amount?.toString() ?? "");
  const [pending, startTransition] = useTransition();
  const id = `macro-${macro}`;

  const [lastAmount, setLastAmount] = useState(amount);
  if (amount !== lastAmount) {
    setLastAmount(amount);
    setValue(amount?.toString() ?? "");
  }

  function save() {
    if (value === (amount?.toString() ?? "")) return;
    startTransition(async () => {
      const result = await setNutritionAmount(dayLogId, macro, value);
      if (!result.ok) {
        toast.error(result.error);
        setValue(amount?.toString() ?? "");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <OptimisticCheckbox
          id={id}
          checked={hit}
          onCheckedChange={(checked) => setNutritionHit(dayLogId, info.hitField, checked)}
          aria-label={`${info.label} target hit`}
        />
        <label htmlFor={id} className="flex flex-1 items-center gap-1.5 text-sm font-medium">
          {info.label}
          {target !== null && (
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="size-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>Counts as hit when {info.rule}.</TooltipContent>
            </Tooltip>
          )}
        </label>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Input
            inputMode="numeric"
            className="h-8 w-20 text-right tabular"
            placeholder="—"
            value={value}
            disabled={pending}
            onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))}
            onBlur={save}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            aria-label={`${info.label} logged (${info.unit})`}
          />
          <span className="w-20 tabular">
            / {target?.toLocaleString() ?? "—"} {info.unit}
          </span>
        </div>
      </div>
      {amount !== null && target !== null && (
        <Progress
          value={Math.min(100, (amount / target) * 100)}
          className="ml-7 h-1"
          aria-label={`${info.label} progress`}
        />
      )}
    </div>
  );
}
