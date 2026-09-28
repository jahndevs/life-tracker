"use client";

import { FlameIcon } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { setHabitDone } from "@/app/actions/habits";
import { setMood } from "@/app/actions/journal";
import { MoodPicker } from "@/components/journal/mood-picker";
import { OptimisticCheckbox } from "@/components/tracking/optimistic-checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function HabitsTodayCard({
  date,
  habits,
}: {
  date: string;
  habits: { id: string; name: string; done: boolean; streak: number }[];
}) {
  const done = habits.filter((h) => h.done).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Habits</CardTitle>
        <CardDescription>Due today.</CardDescription>
        {habits.length > 0 && (
          <CardAction>
            <Badge variant={done === habits.length ? "default" : "secondary"} className="tabular">
              {done}/{habits.length}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {habits.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing due. <Link href="/habits" className="underline">Set up habits</Link>.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {habits.map((h) => (
              <li key={h.id} className="flex items-center gap-3">
                <OptimisticCheckbox
                  id={`habit-${h.id}`}
                  checked={h.done}
                  onCheckedChange={(checked) => setHabitDone(h.id, date, checked)}
                />
                <label htmlFor={`habit-${h.id}`} className="flex-1 text-sm font-medium">
                  {h.name}
                </label>
                {h.streak > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground tabular">
                    <FlameIcon className="size-3.5 text-orange-500" />
                    {h.streak}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function JournalTodayCard({
  date,
  mood,
  snippet,
}: {
  date: string;
  mood: number | null;
  snippet: string | null;
}) {
  const [optimisticMood, setOptimisticMood] = useOptimistic(mood);
  const [, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Journal</CardTitle>
        <CardDescription>How are you feeling?</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <MoodPicker
          size="sm"
          value={optimisticMood}
          onChange={(m) =>
            startTransition(async () => {
              setOptimisticMood(m);
              await setMood(date, m);
            })
          }
        />
        {snippet ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">{snippet}</p>
        ) : null}
        <Link href={`/journal?date=${date}`} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          {snippet ? "Keep writing →" : "Write today's entry →"}
        </Link>
      </CardContent>
    </Card>
  );
}
