"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { finishBook, type BookInput } from "@/app/actions/books";
import type { ActionResult } from "@/app/actions/tracking";
import { StarRating } from "@/components/books/star-rating";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const EMPTY: BookInput = { title: "", author: "", pagesTotal: "", status: "want", notes: "" };

export function BookDialog({
  trigger,
  title,
  initial,
  showStatus,
  onSubmit,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  title: string;
  initial?: BookInput;
  showStatus?: boolean;
  onSubmit: (input: BookInput) => Promise<ActionResult>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [values, setValues] = useState(initial ?? EMPTY);
  const [pending, startTransition] = useTransition();
  const set = (key: keyof BookInput) => (value: string) => setValues((v) => ({ ...v, [key]: value }));

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setValues(initial ?? EMPTY);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await onSubmit(values);
      if (result.ok) setOpen(false);
      else toast.error(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <FieldGroup className="py-6">
            <Field>
              <FieldLabel htmlFor="book-title">Title</FieldLabel>
              <Input id="book-title" value={values.title} onChange={(e) => set("title")(e.target.value)} required />
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field className="col-span-2">
                <FieldLabel htmlFor="book-author">Author</FieldLabel>
                <Input id="book-author" value={values.author} onChange={(e) => set("author")(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="book-pages">Pages</FieldLabel>
                <Input
                  id="book-pages"
                  inputMode="numeric"
                  value={values.pagesTotal}
                  onChange={(e) => set("pagesTotal")(e.target.value.replace(/\D/g, ""))}
                />
              </Field>
            </div>
            {showStatus && (
              <Field>
                <FieldLabel htmlFor="book-status">Shelf</FieldLabel>
                <Select value={values.status} onValueChange={set("status")}>
                  <SelectTrigger id="book-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="want">Up next</SelectItem>
                    <SelectItem value="reading">Reading now</SelectItem>
                    <SelectItem value="finished">Already finished</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="book-notes">Notes</FieldLabel>
              <Textarea
                id="book-notes"
                rows={3}
                value={values.notes}
                onChange={(e) => set("notes")(e.target.value)}
                placeholder="Why you want to read it, key takeaways…"
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FinishDialog({
  bookId,
  title,
  today,
  trigger,
}: {
  bookId: string;
  title: string;
  today: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [date, setDate] = useState(today);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await finishBook(bookId, { rating, finishedAt: date });
      if (result.ok) {
        setOpen(false);
        toast.success(`Finished ${title}`);
      } else toast.error(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Finished {title}</DialogTitle>
            <DialogDescription>How was it?</DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-6">
            <div className="flex justify-center">
              <StarRating value={rating} onChange={setRating} size="lg" />
            </div>
            <Field>
              <FieldLabel htmlFor="finished-at">Finished on</FieldLabel>
              <Input id="finished-at" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Add to finished"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
