"use client";

import { useRouter } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";

// DayPicker uses local Dates; the app uses YYYY-MM-DD strings.
const toDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const toISO = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function JournalCalendar({
  selected,
  today,
  entryDates,
}: {
  selected: string;
  today: string;
  entryDates: string[];
}) {
  const router = useRouter();

  return (
    <Calendar
      mode="single"
      required
      selected={toDate(selected)}
      defaultMonth={toDate(selected)}
      onSelect={(date) => router.push(`/journal?date=${toISO(date)}`)}
      weekStartsOn={1}
      disabled={{ after: toDate(today) }}
      endMonth={toDate(today)}
      modifiers={{ entry: entryDates.map(toDate) }}
      modifiersClassNames={{
        entry:
          "after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary relative",
      }}
      className="mx-auto [--cell-size:--spacing(9)]"
    />
  );
}
