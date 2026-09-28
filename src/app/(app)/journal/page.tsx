import { SearchIcon, XIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { JournalCalendar } from "@/components/journal/journal-calendar";
import { JournalEditor } from "@/components/journal/journal-editor";
import { MoodIcon } from "@/components/journal/mood-picker";
import { DateNav } from "@/components/tracking/day-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth/session";
import { addDays, diffDays, formatLong, formatShort, isISODate, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { journalStreak, snippet } from "@/lib/journal";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Journal" };

export default async function JournalPage({ searchParams }: PageProps<"/journal">) {
  const user = await requireUser();
  const today = todayIn(user.timezone);
  const params = await searchParams;
  const date = isISODate(params.date) && diffDays(params.date, today) >= 0 ? params.date : today;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const tag = typeof params.tag === "string" ? params.tag : "";

  const [current, allDates, results, tags] = await Promise.all([
    db.journalEntry.findFirst({
      where: { dayLog: { userId: user.id, date } },
      include: { tags: { orderBy: { name: "asc" } } },
    }),
    db.journalEntry.findMany({
      where: { dayLog: { userId: user.id } },
      select: { mood: true, body: true, dayLog: { select: { date: true } } },
    }),
    db.journalEntry.findMany({
      where: {
        dayLog: { userId: user.id },
        ...(q && { body: { contains: q } }),
        ...(tag && { tags: { some: { name: tag } } }),
      },
      include: { dayLog: { select: { date: true } }, tags: { orderBy: { name: "asc" } } },
      orderBy: { dayLog: { date: "desc" } },
      take: 30,
    }),
    db.tag.findMany({
      where: { userId: user.id },
      include: { _count: { select: { entries: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const entryDates = allDates.filter((e) => e.body.trim() || e.mood != null).map((e) => e.dayLog.date);
  const streak = journalStreak(entryDates, today);
  const thisMonth = entryDates.filter((d) => d.startsWith(today.slice(0, 7))).length;
  const filterQuery = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(tag && { tag }), ...extra });
    return `/journal?${p}`;
  };

  return (
    <>
      <PageHeader
        title="Journal"
        description={`${streak}-day writing streak · ${thisMonth} ${thisMonth === 1 ? "entry" : "entries"} this month`}
      >
        <DateNav
          basePath="/journal"
          prev={addDays(date, -1)}
          next={date === today ? null : addDays(date, 1)}
          todayLabel="Today"
          isCurrent={date === today}
        />
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{date === today ? "Today" : formatLong(date)}</CardTitle>
            <CardDescription>{date === today ? formatLong(date) : "Looking back"}</CardDescription>
          </CardHeader>
          <CardContent>
            <JournalEditor
              key={date}
              date={date}
              prompt={diffDays("2026-01-01", date)}
              entry={
                current && {
                  body: current.body,
                  mood: current.mood,
                  tags: current.tags.map((t) => t.name),
                }
              }
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardContent>
              <JournalCalendar selected={date} today={today} entryDates={entryDates} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Entries</CardTitle>
              <form action="/journal" className="flex gap-2 pt-2">
                {tag && <input type="hidden" name="tag" value={tag} />}
                <Input name="q" defaultValue={q} placeholder="Search entries" aria-label="Search entries" />
                <Button type="submit" size="icon" variant="outline" aria-label="Search">
                  <SearchIcon />
                </Button>
              </form>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {tags.map((t) => (
                    <Link key={t.id} href={t.name === tag ? filterQuery({ tag: "" }) : filterQuery({ tag: t.name })}>
                      <Badge variant={t.name === tag ? "default" : "outline"}>
                        #{t.name} <span className="opacity-60">{t._count.entries}</span>
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
              {(q || tag) && (
                <Link href="/journal" className="flex items-center gap-1 pt-2 text-xs text-muted-foreground hover:text-foreground">
                  <XIcon className="size-3" /> Clear filters
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {q || tag ? "No entries match." : "Your entries will show up here."}
                </p>
              ) : (
                <ul className="-mx-2 flex flex-col">
                  {results.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={filterQuery({ date: e.dayLog.date })}
                        className={cn(
                          "flex flex-col gap-1 rounded-lg px-2 py-2.5 hover:bg-muted",
                          e.dayLog.date === date && "bg-muted",
                        )}
                      >
                        <span className="flex items-center gap-2 text-sm font-medium">
                          {formatShort(e.dayLog.date)}
                          <MoodIcon mood={e.mood} />
                        </span>
                        {e.body && <span className="text-sm text-muted-foreground">{snippet(e.body)}</span>}
                        {e.tags.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {e.tags.map((t) => `#${t.name}`).join(" ")}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
