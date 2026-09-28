import { FlameIcon, ScaleIcon, TargetIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { DateNav } from "@/components/tracking/day-nav";
import { NutritionCard } from "@/components/tracking/nutrition-card";
import { ScoreRing } from "@/components/tracking/score-ring";
import { SupplementsCard } from "@/components/tracking/supplements-card";
import { WorkoutsCard } from "@/components/tracking/workouts-card";
import { HabitsTodayCard, JournalTodayCard } from "@/components/tracking/life-cards";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { progressPct } from "@/lib/books";
import { pct, scoreDay, STREAK_THRESHOLD, type Tally } from "@/lib/adherence";
import { requireUser } from "@/lib/auth/session";
import { addDays, diffDays, formatLong, isISODate, todayIn, weekday } from "@/lib/dates";
import { ensureDay, getStreak, latestWeighIn } from "@/lib/days";
import { db } from "@/lib/db";
import { loadHabits } from "@/lib/habit-data";
import { isScheduled } from "@/lib/habits";
import { snippet } from "@/lib/journal";
import { phaseOn, targetWeightOn, type PhaseStatus } from "@/lib/phases";
import { requirePlan, targetsOn } from "@/lib/plan";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage({ searchParams }: PageProps<"/">) {
  const user = await requireUser();
  const plan = await requirePlan(user.id);
  const today = todayIn(user.timezone);

  const requested = (await searchParams).date;
  const date = isISODate(requested) && diffDays(requested, today) >= 0 ? requested : today;
  const isToday = date === today;

  const [day, streak, lastWeighIn, habits, journal, reading] = await Promise.all([
    ensureDay(user.id, date, { syncSupplements: isToday }),
    getStreak(user, today),
    latestWeighIn(user.id, date),
    loadHabits(user.id, today),
    db.journalEntry.findFirst({ where: { dayLog: { userId: user.id, date } } }),
    db.book.findMany({ where: { userId: user.id, status: "reading" }, orderBy: { updatedAt: "desc" }, take: 3 }),
  ]);

  const score = scoreDay(day);
  const status = phaseOn(plan, date);
  const targetWeight = targetWeightOn(plan, date);
  const nutrition = day.nutrition ?? {
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    waterOz: null,
    hitCalories: false,
    hitProtein: false,
    hitCarbs: false,
    hitFat: false,
    hitWater: false,
  };

  return (
    <>
      <PageHeader
        title={isToday ? "Today" : formatLong(date)}
        description={<PhaseLine status={status} raceName={plan.raceName} date={isToday ? formatLong(date) : null} />}
      >
        <DateNav
          basePath="/"
          prev={addDays(date, -1)}
          next={isToday ? null : addDays(date, 1)}
          todayLabel="Today"
          isCurrent={isToday}
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardContent className="flex items-center gap-4">
            <ScoreRing value={pct(score.overall)} label="day" />
            <div className="flex flex-1 flex-col gap-2 text-xs">
              <MiniBar label="Nutrition" tally={score.nutrition} />
              <MiniBar label="Supplements" tally={score.supplements} />
              <MiniBar label="Training" tally={score.workouts} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <FlameIcon className="size-4 text-orange-500" /> Streak
            </CardDescription>
            <CardTitle className="text-3xl tabular">
              {streak} <span className="text-base font-normal text-muted-foreground">{streak === 1 ? "day" : "days"}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Days at {STREAK_THRESHOLD}%+ in a row.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <TargetIcon className="size-4" /> Target this week
            </CardDescription>
            <CardTitle className="text-3xl tabular">
              {targetWeight} <span className="text-base font-normal text-muted-foreground">lb</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {lastWeighIn?.weight != null ? (
              <WeightDelta weight={lastWeighIn.weight} target={targetWeight} date={lastWeighIn.date} />
            ) : (
              <Link href="/weigh-ins" className="underline">Log your first weigh-in</Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>{status.kind === "active" ? "This phase" : "Up next"}</CardDescription>
            <CardTitle>
              {status.kind === "active" ? status.phase.name : status.kind === "before" ? status.next.name : "Race done"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {status.kind === "active" ? status.phase.focus : status.kind === "before" ? status.next.focus : "Recover, then pick the next one."}
          </CardContent>
        </Card>
      </div>

      {isToday && weekday(date) === 0 && lastWeighIn?.date !== date && (
        <Card className="mt-4 border-primary/40 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <ScaleIcon className="size-4 text-primary" /> It&apos;s Monday: weigh in and measure.
            </span>
            <Link href="/weigh-ins" className="font-medium text-primary underline-offset-4 hover:underline">
              Log weigh-in →
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <NutritionCard
            dayLogId={day.id}
            nutrition={nutrition}
            targets={targetsOn(plan, date)}
            longSession={day.workouts.some((w) => w.hardLong)}
          />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-2">
          <WorkoutsCard date={date} workouts={day.workouts} />
          <SupplementsCard logs={day.supplements} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <HabitsTodayCard
          date={date}
          habits={habits
            .filter((h) => isScheduled(h, date) || h.done.has(date))
            .map((h) => ({ id: h.id, name: h.name, done: h.done.has(date), streak: h.stats.streak }))}
        />
        <JournalTodayCard
          key={date}
          date={date}
          mood={journal?.mood ?? null}
          snippet={journal?.body ? snippet(journal.body, 200) : null}
        />
        <Card>
          <CardHeader>
            <CardTitle>Reading</CardTitle>
            <CardDescription>{reading.length === 0 ? "Nothing on the go." : "On the nightstand."}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {reading.map((b) => {
              const p = progressPct(b);
              return (
                <div key={b.id} className="flex flex-col gap-1.5">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{b.title}</span>
                    <span className="shrink-0 text-muted-foreground tabular">{p === null ? `p. ${b.pagesRead}` : `${p}%`}</span>
                  </div>
                  <Progress value={p ?? 0} className="h-1" aria-label={`${b.title} progress`} />
                </div>
              );
            })}
            <Link href="/books" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              {reading.length === 0 ? "Pick a book →" : "Update pages →"}
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function PhaseLine({ status, raceName, date }: { status: PhaseStatus; raceName: string; date: string | null }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      {date && <span>{date}</span>}
      {status.kind === "active" && (
        <>
          <Badge>{status.phase.name}</Badge>
          <span>
            Week {status.week} of {status.phase.weeks}
          </span>
          <span aria-hidden>·</span>
          <span>
            {status.daysToRace === 0 ? `${raceName} is today` : `${status.daysToRace} days to ${raceName}`}
          </span>
        </>
      )}
      {status.kind === "before" && (
        <Badge variant="secondary">Plan starts in {status.daysUntilStart} days</Badge>
      )}
      {status.kind === "after" && <Badge variant="secondary">Post-race</Badge>}
    </span>
  );
}

function MiniBar({ label, tally }: { label: string; tally: Tally }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular">
          {tally.done}/{tally.total}
        </span>
      </div>
      <Progress value={pct(tally) ?? 0} className="h-1" />
    </div>
  );
}

function WeightDelta({ weight, target, date }: { weight: number; target: number; date: string }) {
  const delta = Math.round((weight - target) * 10) / 10;
  return (
    <span>
      Last: <span className="font-medium text-foreground tabular">{weight} lb</span>{" "}
      {delta <= 0 ? (
        <span className="text-primary">on pace{delta < 0 ? ` (${Math.abs(delta)} under)` : ""}</span>
      ) : (
        <span className="text-orange-500">{delta} lb over</span>
      )}{" "}
      <span>· {formatLong(date).split(",")[1]?.trim()}</span>
    </span>
  );
}
