"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { diffDays, todayIn } from "@/lib/dates";
import { ensureDay } from "@/lib/days";
import { db } from "@/lib/db";
import { parseTags } from "@/lib/journal";
import { isoDate, JournalSchema } from "@/lib/validation";
import type { ActionResult } from "@/app/actions/tracking";

function refresh() {
  revalidatePath("/", "layout");
}

async function ownedDay(date: string) {
  const user = await requireUser();
  const day = isoDate.parse(date);
  if (diffDays(day, todayIn(user.timezone)) < 0) throw new Error("Can't journal in the future.");
  return { user, day: await ensureDay(user.id, day) };
}

async function pruneTags(userId: string) {
  await db.tag.deleteMany({ where: { userId, entries: { none: {} } } });
}

export async function saveJournalEntry(
  date: string,
  input: { body: string; mood: number | null; tags: string },
): Promise<ActionResult> {
  const parsed = JournalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { user, day } = await ownedDay(date);
  const { body, mood } = parsed.data;
  const tags = parseTags(parsed.data.tags);

  if (!body.trim() && mood === null && tags.length === 0) {
    await db.journalEntry.deleteMany({ where: { dayLogId: day.id } });
  } else {
    const connect = tags.map((name) => ({
      where: { userId_name: { userId: user.id, name } },
      create: { userId: user.id, name },
    }));
    await db.journalEntry.upsert({
      where: { dayLogId: day.id },
      create: { dayLogId: day.id, body, mood, tags: { connectOrCreate: connect } },
      update: { body, mood, tags: { set: [], connectOrCreate: connect } },
    });
  }
  await pruneTags(user.id);
  refresh();
  return { ok: true };
}

export async function setMood(date: string, mood: number | null) {
  if (mood !== null && !(Number.isInteger(mood) && mood >= 1 && mood <= 5)) return;
  const { day } = await ownedDay(date);
  await db.journalEntry.upsert({
    where: { dayLogId: day.id },
    create: { dayLogId: day.id, mood },
    update: { mood },
  });
  refresh();
}

export async function deleteJournalEntry(date: string) {
  const { user, day } = await ownedDay(date);
  await db.journalEntry.deleteMany({ where: { dayLogId: day.id } });
  await pruneTags(user.id);
  refresh();
}
