import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ClearWeighInButton } from "@/components/tracking/clear-weigh-in-button";
import { WeighInForm } from "@/components/tracking/weigh-in-form";
import { WeightChart, type WeightPoint } from "@/components/tracking/weight-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth/session";
import { diffDays, formatDate, formatShort, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { cutEndDate, targetCurve, targetWeightOn } from "@/lib/phases";
import { requirePlan } from "@/lib/plan";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Weigh-ins" };

const round1 = (n: number) => Math.round(n * 10) / 10;

export default async function WeighInsPage() {
  const user = await requireUser();
  const plan = await requirePlan(user.id);
  const today = todayIn(user.timezone);

  const entries = await db.dayLog.findMany({
    where: {
      userId: user.id,
      OR: [
        { weight: { not: null } },
        { waistNavel: { not: null } },
        { waistNatural: { not: null } },
        { chest: { not: null } },
        { arm: { not: null } },
        { thigh: { not: null } },
        { hips: { not: null } },
      ],
    },
    orderBy: { date: "asc" },
  });
  const weighIns = entries.filter((e) => e.weight != null) as ((typeof entries)[number] & { weight: number })[];

  const points = new Map<string, WeightPoint>();
  for (const { date, target } of targetCurve(plan)) {
    points.set(date, { x: diffDays(plan.startDate, date), date, target, actual: null });
  }
  for (const w of weighIns) {
    points.set(w.date, {
      x: diffDays(plan.startDate, w.date),
      date: w.date,
      target: targetWeightOn(plan, w.date),
      actual: w.weight,
    });
  }
  const chartData = [...points.values()].sort((a, b) => a.x - b.x);

  const latest = weighIns.at(-1);
  const lost = latest ? round1(plan.startWeight - latest.weight) : 0;
  const toGo = latest ? round1(Math.max(0, latest.weight - plan.goalWeight)) : round1(plan.startWeight - plan.goalWeight);
  const targetNow = targetWeightOn(plan, today);
  const vsTarget = latest ? round1(latest.weight - targetWeightOn(plan, latest.date)) : null;

  return (
    <>
      <PageHeader
        title="Weigh-ins"
        description={`Monday check-ins. ${plan.startWeight} → ${plan.goalWeight} lb by ${formatDate(cutEndDate(plan), { month: "short", day: "numeric", year: "numeric" })}, ${plan.weeklyLossLb} lb/week.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Current" value={latest ? `${latest.weight}` : "—"} unit="lb" note={latest ? formatShort(latest.date) : "No weigh-ins yet"} />
        <Stat label="Lost so far" value={`${lost}`} unit="lb" note={`From ${plan.startWeight} lb`} />
        <Stat label="To goal" value={`${toGo}`} unit="lb" note={`Goal ${plan.goalWeight} lb`} />
        <Stat
          label="vs. target"
          value={vsTarget == null ? "—" : `${vsTarget > 0 ? "+" : ""}${vsTarget}`}
          unit={vsTarget == null ? "" : "lb"}
          note={`This week's target: ${targetNow} lb`}
          tone={vsTarget == null ? undefined : vsTarget <= 0 ? "good" : "warn"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Actual vs. target</CardTitle>
            <CardDescription>The dashed line steps down each Monday.</CardDescription>
          </CardHeader>
          <CardContent>
            <WeightChart data={chartData} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Log a weigh-in</CardTitle>
            <CardDescription>Same scale, same time, before eating.</CardDescription>
          </CardHeader>
          <CardContent>
            <WeighInForm today={today} target={targetNow} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your weigh-ins will show up here.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">vs. target</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Waist (navel)</TableHead>
                  <TableHead className="text-right">Waist (nat.)</TableHead>
                  <TableHead className="text-right">Chest</TableHead>
                  <TableHead className="text-right">Arm</TableHead>
                  <TableHead className="text-right">Thigh</TableHead>
                  <TableHead className="text-right">Hips</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...entries].reverse().map((e) => {
                  const target = targetWeightOn(plan, e.date);
                  const prev = weighIns.filter((w) => w.date < e.date).at(-1);
                  const diff = e.weight != null ? round1(e.weight - target) : null;
                  const change = e.weight != null && prev ? round1(e.weight - prev.weight) : null;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{formatShort(e.date)}</TableCell>
                      <Num value={e.weight} />
                      <Num value={target} muted />
                      <TableCell
                        className={cn(
                          "text-right tabular",
                          diff != null && (diff <= 0 ? "text-primary" : "text-orange-500"),
                        )}
                      >
                        {diff == null ? "" : `${diff > 0 ? "+" : ""}${diff}`}
                      </TableCell>
                      <TableCell className="text-right tabular text-muted-foreground">
                        {change == null ? "" : `${change > 0 ? "+" : ""}${change}`}
                      </TableCell>
                      <Num value={e.waistNavel} />
                      <Num value={e.waistNatural} />
                      <Num value={e.chest} />
                      <Num value={e.arm} />
                      <Num value={e.thigh} />
                      <Num value={e.hips} />
                      <TableCell className="text-right">
                        <ClearWeighInButton dayLogId={e.id} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Stat({
  label,
  value,
  unit,
  note,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  note: string;
  tone?: "good" | "warn";
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={cn(
            "text-3xl tabular",
            tone === "good" && "text-primary",
            tone === "warn" && "text-orange-500",
          )}
        >
          {value} <span className="text-base font-normal text-muted-foreground">{unit}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{note}</CardContent>
    </Card>
  );
}

function Num({ value, muted }: { value: number | null; muted?: boolean }) {
  return (
    <TableCell className={cn("text-right tabular", muted && "text-muted-foreground")}>
      {value ?? ""}
    </TableCell>
  );
}
