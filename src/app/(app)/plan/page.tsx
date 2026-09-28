import type { Metadata } from "next";
import { savePlan } from "@/app/actions/plan";
import { PageHeader } from "@/components/page-header";
import { PlanForm } from "@/components/plan/plan-form";
import { SupplementsEditor } from "@/components/plan/supplements-editor";
import { TargetsEditor } from "@/components/plan/targets-editor";
import { WeekTemplateEditor } from "@/components/plan/week-template-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { diffDays, formatDate, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { buildPhases, phaseOn } from "@/lib/phases";
import { requirePlan } from "@/lib/plan";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Plan" };

const fmt = (d: string) => formatDate(d, { month: "short", day: "numeric" });

export default async function PlanPage() {
  const user = await requireUser();
  const plan = await requirePlan(user.id);
  const today = todayIn(user.timezone);

  const [supplements, templates] = await Promise.all([
    db.supplement.findMany({ where: { userId: user.id }, orderBy: { sortOrder: "asc" } }),
    db.workoutTemplate.findMany({ where: { userId: user.id }, orderBy: { sortOrder: "asc" } }),
  ]);

  const phases = buildPhases(plan);
  const status = phaseOn(plan, today);
  const currentKey = status.kind === "active" ? status.phase.key : null;
  const totalDays = Math.max(1, diffDays(plan.startDate, plan.raceDate) + 1);
  const todayOffset = diffDays(plan.startDate, today) / totalDays;

  return (
    <>
      <PageHeader
        title="Plan"
        description={`${plan.raceName} · ${formatDate(plan.raceDate, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Phases</CardTitle>
          <CardDescription>
            Worked out from your numbers: the cut runs until you reach goal weight, and race prep
            counts back from race day.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="relative">
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
              {phases.map((p) => (
                <div
                  key={p.key}
                  className={cn("h-full", p.key === currentKey ? "bg-primary" : "bg-muted")}
                  style={{ flexGrow: diffDays(p.start, p.end) + 1 }}
                  title={p.name}
                />
              ))}
            </div>
            {todayOffset >= 0 && todayOffset <= 1 && (
              <div
                className="absolute -top-1 h-5 w-0.5 rounded bg-foreground"
                style={{ left: `${todayOffset * 100}%` }}
                aria-label="Today"
              />
            )}
          </div>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {phases.map((p, i) => (
              <li
                key={p.key}
                className={cn(
                  "rounded-lg border p-4",
                  p.key === currentKey && "border-primary/50 bg-primary/5",
                )}
              >
                <div className="text-xs text-muted-foreground">
                  Phase {i + 1} · {p.weeks} {p.weeks === 1 ? "week" : "weeks"}
                </div>
                <div className="mt-1 font-medium">
                  {p.name}
                  {p.key === currentKey && status.kind === "active" && (
                    <span className="ml-2 text-xs text-primary">week {status.week}</span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground tabular">
                  {fmt(p.start)} – {fmt(p.end)}
                </div>
                <p className="mt-2 text-sm">{p.focus}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Race & weight</CardTitle>
            <CardDescription>Changing these reshapes the phases and weekly targets.</CardDescription>
          </CardHeader>
          <CardContent>
            <PlanForm action={savePlan} submitLabel="Save plan" defaults={plan} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2" id="supplements">
          <CardHeader>
            <CardTitle>Supplement stack</CardTitle>
            <CardDescription>Your daily checklist.</CardDescription>
          </CardHeader>
          <CardContent>
            <SupplementsEditor supplements={supplements} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4" id="targets">
        <CardHeader>
          <CardTitle>Daily macro targets</CardTitle>
          <CardDescription>Each phase has its own; today uses the current phase.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <TargetsEditor targets={plan.targets} currentPhase={currentKey} />
        </CardContent>
      </Card>

      <Card className="mt-4" id="training">
        <CardHeader>
          <CardTitle>Training week</CardTitle>
          <CardDescription>
            The sessions each weekday starts with. Mark long or hard ones so Today reminds you to fuel them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WeekTemplateEditor templates={templates} />
        </CardContent>
      </Card>
    </>
  );
}
