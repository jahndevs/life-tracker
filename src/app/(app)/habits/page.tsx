import { ArchiveRestoreIcon, FlameIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { createHabit, setHabitArchived } from "@/app/actions/habits";
import { PageHeader } from "@/components/page-header";
import { ConsistencyHeatmap } from "@/components/habits/consistency-heatmap";
import { HabitDialog } from "@/components/habits/habit-dialog";
import { HabitsTable, type HabitRow } from "@/components/habits/habits-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pct, sum } from "@/lib/adherence";
import { requireUser } from "@/lib/auth/session";
import { addDays, formatDate, startOfWeek, todayIn } from "@/lib/dates";
import { consistency, loadHabits } from "@/lib/habit-data";
import { cadenceLabel, isScheduled } from "@/lib/habits";

export const metadata: Metadata = { title: "Habits" };

const HEATMAP_WEEKS = 16;

export default async function HabitsPage() {
  const user = await requireUser();
  const today = todayIn(user.timezone);
  const [habits, archived] = await Promise.all([
    loadHabits(user.id, today),
    loadHabits(user.id, today, { archived: true }),
  ]);

  const columns = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, label: formatDate(date, { weekday: "short", day: "numeric" }), isToday: date === today };
  });

  const rows: HabitRow[] = habits.map((h) => ({
    id: h.id,
    name: h.name,
    cadence: h.cadence,
    days: h.days,
    cadenceLabel: cadenceLabel(h),
    cells: columns.map((c) => ({ date: c.date, scheduled: isScheduled(h, c.date), done: h.done.has(c.date) })),
    streak: h.stats.streak,
    best: h.stats.best,
    rate: pct(h.stats.last30),
  }));

  const dueToday = habits.filter((h) => h.scheduledToday);
  const doneToday = dueToday.filter((h) => h.done.has(today)).length;
  const topStreak = habits.reduce<{ name: string; streak: number } | null>(
    (best, h) => (h.stats.streak > (best?.streak ?? 0) ? { name: h.name, streak: h.stats.streak } : best),
    null,
  );
  const overall30 = pct(sum(habits.map((h) => h.stats.last30)));

  const heatFrom = addDays(startOfWeek(today), -(HEATMAP_WEEKS - 1) * 7);
  const heat = consistency(habits, heatFrom, HEATMAP_WEEKS * 7, today);

  return (
    <>
      <PageHeader title="Habits" description="Small things, every scheduled day.">
        <HabitDialog
          title="New habit"
          onSubmit={createHabit}
          trigger={
            <Button>
              <PlusIcon /> New habit
            </Button>
          }
        />
      </PageHeader>

      {habits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <FlameIcon className="size-8 text-muted-foreground" />
            <div className="font-medium">No habits yet</div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Start with one or two: read 20 pages, stretch 10 minutes, lights out by 10:30.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Today</CardDescription>
                <CardTitle className="text-3xl tabular">
                  {doneToday}
                  <span className="text-base font-normal text-muted-foreground"> / {dueToday.length} done</span>
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription className="flex items-center gap-1.5">
                  <FlameIcon className="size-4 text-orange-500" /> Longest active streak
                </CardDescription>
                <CardTitle className="text-3xl tabular">
                  {topStreak?.streak ?? 0}
                  <span className="text-base font-normal text-muted-foreground">
                    {topStreak ? ` · ${topStreak.name}` : " days"}
                  </span>
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Last 30 days</CardDescription>
                <CardTitle className="text-3xl tabular">{overall30 === null ? "—" : `${overall30}%`}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Last 7 days</CardTitle>
              <CardDescription>Faded boxes are unscheduled days. Checking one is logged but doesn&apos;t affect streaks.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <HabitsTable habits={rows} columns={columns} />
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Consistency</CardTitle>
              <CardDescription>Share of scheduled habits done each day, last {HEATMAP_WEEKS} weeks.</CardDescription>
            </CardHeader>
            <CardContent>
              <ConsistencyHeatmap days={heat} />
            </CardContent>
          </Card>
        </>
      )}

      {archived.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Archived</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {archived.map((h) => (
                <li key={h.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {h.name} · best streak {h.stats.best}
                  </span>
                  <form action={setHabitArchived.bind(null, h.id, false)}>
                    <Button size="sm" variant="ghost" type="submit">
                      <ArchiveRestoreIcon /> Restore
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
