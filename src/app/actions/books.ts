"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { requireUser } from "@/lib/auth/session";
import { todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { BookSchema, isoDate } from "@/lib/validation";
import type { ActionResult } from "@/app/actions/tracking";

function refresh() {
  revalidatePath("/", "layout");
}

export type BookInput = {
  title: string;
  author: string;
  pagesTotal: string;
  status: string;
  notes: string;
};

export async function addBook(input: BookInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = BookSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const today = todayIn(user.timezone);
  const { status, pagesTotal } = parsed.data;

  await db.book.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      author: parsed.data.author || null,
      notes: parsed.data.notes || null,
      status,
      pagesTotal: pagesTotal ?? null,
      pagesRead: status === "finished" ? (pagesTotal ?? 0) : 0,
      startedAt: status === "want" ? null : today,
      finishedAt: status === "finished" ? today : null,
    },
  });
  refresh();
  return { ok: true };
}

export async function updateBook(id: string, input: BookInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = BookSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  await db.book.updateMany({
    where: { id, userId: user.id },
    data: {
      title: parsed.data.title,
      author: parsed.data.author || null,
      pagesTotal: parsed.data.pagesTotal ?? null,
      notes: parsed.data.notes || null,
    },
  });
  refresh();
  return { ok: true };
}

export async function setPagesRead(id: string, raw: string): Promise<ActionResult> {
  const user = await requireUser();
  const pages = z.coerce.number().int().min(0).max(20000).safeParse(raw);
  if (raw.trim() === "" || !pages.success) return { ok: false, error: "Enter a page number." };
  const book = await db.book.findFirst({ where: { id, userId: user.id } });
  if (!book) return { ok: false, error: "Book not found." };
  const pagesRead = book.pagesTotal ? Math.min(pages.data, book.pagesTotal) : pages.data;
  await db.book.update({ where: { id }, data: { pagesRead } });
  refresh();
  return { ok: true };
}

export async function startBook(id: string) {
  const user = await requireUser();
  await db.book.updateMany({
    where: { id, userId: user.id },
    data: { status: "reading", startedAt: todayIn(user.timezone), finishedAt: null },
  });
  refresh();
}

export async function shelveBook(id: string) {
  const user = await requireUser();
  await db.book.updateMany({
    where: { id, userId: user.id },
    data: { status: "want", finishedAt: null },
  });
  refresh();
}

export async function finishBook(
  id: string,
  input: { rating: number | null; finishedAt: string },
): Promise<ActionResult> {
  const user = await requireUser();
  const rating = z.number().int().min(1).max(5).nullable().safeParse(input.rating);
  const finishedAt = isoDate.safeParse(input.finishedAt);
  if (!rating.success || !finishedAt.success) return { ok: false, error: "Check the rating and date." };
  const book = await db.book.findFirst({ where: { id, userId: user.id } });
  if (!book) return { ok: false, error: "Book not found." };

  await db.book.update({
    where: { id },
    data: {
      status: "finished",
      rating: rating.data,
      finishedAt: finishedAt.data,
      startedAt: book.startedAt ?? finishedAt.data,
      pagesRead: book.pagesTotal ?? book.pagesRead,
    },
  });
  refresh();
  return { ok: true };
}

export async function rateBook(id: string, rating: number) {
  const user = await requireUser();
  if (!(Number.isInteger(rating) && rating >= 1 && rating <= 5)) return;
  await db.book.updateMany({ where: { id, userId: user.id }, data: { rating } });
  refresh();
}

export async function deleteBook(id: string) {
  const user = await requireUser();
  await db.book.deleteMany({ where: { id, userId: user.id } });
  refresh();
}
