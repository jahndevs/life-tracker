import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { DateNav } from "@/components/tracking/day-nav";
import { ScoreRing } from "@/components/tracking/score-ring";
import { WeekGrid, type WeekCell } from "@/components/tracking/week-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pct, scoreDay, sum, type Tally } from "@/lib/adherence";
import { requireUser } from "@/lib/auth/session";
import {
  addDays,
  diffDays,
  formatDate,
  isISODate,
  startOfWeek,
  todayIn,
  weekDates,
  weekday,
} from "@/lib/dates";
import { ensureDay, trackingStart, type FullDay } from "@/lib/days";
import { db } from "@/lib/db";
import { phaseOn } from "@/lib/phases";
import { requirePlan } from "@/lib/plan";

export const metadata: Metadata = { title: "Week" };

export default async function WeekPage({ searchParams }: PageProps<"/week">) {
  const user = await requireUser();
  const plan = await requirePlan(user.id);
  const today = todayIn(user.timezone);
  const firstDay = trackingStart(user);

  const requested = (await searchParams).date;
  const monday = startOfWeek(isISODate(requested) ? requested : today);
  const isCurrentWeek = monday === startOfWeek(today);
  const dates = weekDates(monday);

  // Create past days so ones you skipped count as misses.
  const logs = new Map<string, FullDay>();
  for (const date of dates) {
    if (diffDays(date, today) >= 0 && diffDays(firstDay, date) >= 0) {
      logs.set(date, await ensureDay(user.id, date, { syncSupplements: date === today }));
    }
  }

  const [supplements, templates] = await Promise.all([
    db.supplement.findMany({ where: { userId: user.id }, orderBy: { sortOrder: "asc" } }),
    db.workoutTemplate.findMany({ where: { userId: user.id }, orderBy: { sortOrder: "asc" } }),
  ]);

  const cells: WeekCell[] = dates.map((date) => {
    const log = logs.get(date);
    return {
      date,
      label: formatDate(date, { weekday: "short", day: "numeric" }),
      isToday: date === today,
      tracked: !!log,
      dayLogId: log?.id ?? null,
      hits: log?.nutrition ?? null,
      supplements: Object.fromEntries((log?.supplements ?? []).map((s) => [s.supplementId, s.taken])),
      workouts: log
        ? log.workouts.map((w) => ({
            id: w.id,
            type: w.type,
            protocol: w.protocol ?? "",
            completed: w.completed,
            hardLong: w.hardLong,
          }))
        : templates
            .filter((t) => t.weekday === weekday(date))
            .map((t) => ({ id: null, type: t.type, protocol: t.protocol, completed: false, hardLong: t.hardLong })),
      weight: log?.weight ?? null,
    };
  });

  const loggedSupplementIds = new Set(cells.flatMap((c) => Object.keys(c.supplements)));
  const supplementRows = supplements
    .filter((s) => s.active || loggedSupplementIds.has(s.id))
    .map((s) => ({ id: s.id, name: s.name }));

  const scores = [...logs.values()].map(scoreDay);
  const totals = {
    nutrition: sum(scores.map((s) => s.nutrition)),
    supplements: sum(scores.map((s) => s.supplements)),
    workouts: sum(scores.map((s) => s.workouts)),
    overall: sum(scores.map((s) => s.overall)),
  };

  const status = phaseOn(plan, monday);
  const range = `${formatDate(monday, { month: "short", day: "numeric" })} – ${formatDate(addDays(monday, 6), { month: "short", day: "numeric" })}`;

  return (
    <>
      <PageHeader
        title="Week"
        description={
          <>
            {range}
            {status.kind === "active" && ` · ${status.phase.name}, week ${status.week} of ${status.phase.weeks}`}
          </>
        }
      >
        <DateNav
          basePath="/week"
          prev={addDays(monday, -7)}
          next={isCurrentWeek ? null : addDays(monday, 7)}
          todayLabel="This week"
          isCurrent={isCurrentWeek}
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <ScoreRing value={pct(totals.overall)} label="week" />
            <div className="text-sm text-muted-foreground">
              {logs.size === 0 ? "Nothing tracked yet this week." : `Across ${logs.size} tracked ${logs.size === 1 ? "day" : "days"}.`}
            </div>
          </CardContent>
        </Card>
        <Tile title="Nutrition" tally={totals.nutrition} />
        <Tile title="Supplements" tally={totals.supplements} />
        <Tile title="Workouts" tally={totals.workouts} />
      </div>

      <Card className="mt-4">
        <CardContent className="overflow-x-auto">
          <WeekGrid days={cells} supplements={supplementRows} />
        </CardContent>
      </Card>
    </>
  );
}

function Tile({ title, tally }: { title: string; tally: Tally }) {
  const value = pct(tally);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tabular">{value === null ? "—" : `${value}%`}</div>
        <div className="mt-1 text-xs text-muted-foreground tabular">
          {tally.done} of {tally.total} hit
        </div>
      </CardContent>
    </Card>
  );
}
