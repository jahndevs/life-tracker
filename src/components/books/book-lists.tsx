"use client";

import {
  BookmarkIcon,
  CheckIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlayIcon,
  Trash2Icon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteBook,
  rateBook,
  setPagesRead,
  shelveBook,
  startBook,
  updateBook,
} from "@/app/actions/books";
import { BookDialog, FinishDialog } from "@/components/books/book-dialogs";
import { StarRating } from "@/components/books/star-rating";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { progressPct } from "@/lib/books";
import { diffDays, formatDate } from "@/lib/dates";

export type BookView = {
  id: string;
  title: string;
  author: string | null;
  status: string;
  rating: number | null;
  pagesTotal: number | null;
  pagesRead: number;
  startedAt: string | null;
  finishedAt: string | null;
  notes: string | null;
};

const fmt = (d: string) => formatDate(d, { month: "short", day: "numeric", year: "numeric" });

export function ReadingCard({ book, today }: { book: BookView; today: string }) {
  const [pages, setPages] = useState(String(book.pagesRead));
  const [pending, startTransition] = useTransition();
  const progress = progressPct(book);

  const [lastRead, setLastRead] = useState(book.pagesRead);
  if (book.pagesRead !== lastRead) {
    setLastRead(book.pagesRead);
    setPages(String(book.pagesRead));
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await setPagesRead(book.id, pages);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="leading-snug">{book.title}</CardTitle>
        <CardDescription>
          {book.author}
          {book.startedAt && ` · started ${formatDate(book.startedAt, { month: "short", day: "numeric" })}`}
        </CardDescription>
        <CardAction>
          <BookMenu book={book} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-muted-foreground tabular">
            <span>
              {book.pagesTotal ? `p. ${book.pagesRead} of ${book.pagesTotal}` : `p. ${book.pagesRead}`}
            </span>
            {progress !== null && <span>{progress}%</span>}
          </div>
          <Progress value={progress ?? 0} className="h-1.5" aria-label={`${book.title} progress`} />
        </div>
        <div className="flex items-center gap-2">
          <form onSubmit={save} className="flex flex-1 items-center gap-2">
            <Input
              inputMode="numeric"
              value={pages}
              onChange={(e) => setPages(e.target.value.replace(/\D/g, ""))}
              className="h-8 w-20 tabular"
              aria-label="Current page"
            />
            <Button type="submit" size="sm" variant="outline" disabled={pending || pages === String(book.pagesRead)}>
              Update page
            </Button>
          </form>
          <FinishDialog
            bookId={book.id}
            title={book.title}
            today={today}
            trigger={
              <Button size="sm">
                <CheckIcon /> Finish
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function UpNextRow({ book }: { book: BookView }) {
  const [pending, startTransition] = useTransition();
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{book.title}</div>
        <div className="truncate text-sm text-muted-foreground">
          {[book.author, book.pagesTotal && `${book.pagesTotal} pages`].filter(Boolean).join(" · ")}
        </div>
      </div>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(() => startBook(book.id))}>
        <PlayIcon /> Start
      </Button>
      <BookMenu book={book} />
    </li>
  );
}

export function FinishedRow({ book }: { book: BookView }) {
  const [, startTransition] = useTransition();
  const days =
    book.startedAt && book.finishedAt ? diffDays(book.startedAt, book.finishedAt) + 1 : null;
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{book.title}</div>
        <div className="truncate text-sm text-muted-foreground">
          {[book.author, book.finishedAt && fmt(book.finishedAt), days && `${days} ${days === 1 ? "day" : "days"}`]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
      <StarRating value={book.rating} onChange={(r) => startTransition(() => rateBook(book.id, r))} />
      <BookMenu book={book} />
    </li>
  );
}

function BookMenu({ book }: { book: BookView }) {
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label={`${book.title} options`}>
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <PencilIcon /> Edit
          </DropdownMenuItem>
          {book.status !== "reading" && (
            <DropdownMenuItem onSelect={() => startTransition(() => startBook(book.id))}>
              <PlayIcon /> {book.status === "finished" ? "Reread" : "Start reading"}
            </DropdownMenuItem>
          )}
          {book.status !== "want" && (
            <DropdownMenuItem onSelect={() => startTransition(() => shelveBook(book.id))}>
              <BookmarkIcon /> Move to up next
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              if (confirm(`Delete "${book.title}"?`)) startTransition(() => deleteBook(book.id));
            }}
          >
            <Trash2Icon /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BookDialog
        title="Edit book"
        open={editing}
        onOpenChange={setEditing}
        initial={{
          title: book.title,
          author: book.author ?? "",
          pagesTotal: book.pagesTotal?.toString() ?? "",
          status: book.status,
          notes: book.notes ?? "",
        }}
        onSubmit={(input) => updateBook(book.id, input)}
      />
    </>
  );
}
