import { BookOpenIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { addBook } from "@/app/actions/books";
import { PageHeader } from "@/components/page-header";
import { BookDialog } from "@/components/books/book-dialogs";
import { FinishedRow, ReadingCard, UpNextRow } from "@/components/books/book-lists";
import { BooksChart } from "@/components/books/books-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser } from "@/lib/auth/session";
import { yearStats } from "@/lib/books";
import { todayIn } from "@/lib/dates";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Books" };

export default async function BooksPage() {
  const user = await requireUser();
  const today = todayIn(user.timezone);
  const year = Number(today.slice(0, 4));

  const books = await db.book.findMany({
    where: { userId: user.id },
    orderBy: [{ updatedAt: "desc" }],
  });
  const reading = books.filter((b) => b.status === "reading");
  const upNext = books.filter((b) => b.status === "want").sort((a, b) => +a.createdAt - +b.createdAt);
  const finished = books
    .filter((b) => b.status === "finished")
    .sort((a, b) => (b.finishedAt ?? "").localeCompare(a.finishedAt ?? ""));
  const stats = yearStats(books, year);
  const byYear = Map.groupBy(finished, (b) => b.finishedAt?.slice(0, 4) ?? "Undated");

  return (
    <>
      <PageHeader title="Books" description={`${stats.count} finished in ${year}`}>
        <BookDialog
          title="Add a book"
          showStatus
          onSubmit={addBook}
          trigger={
            <Button>
              <PlusIcon /> Add book
            </Button>
          }
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Reading now" value={reading.length} />
        <Stat label={`Finished in ${year}`} value={stats.count} />
        <Stat label={`Pages in ${year}`} value={stats.pages.toLocaleString()} />
        <Stat label="Average rating" value={stats.avgRating ?? "—"} unit={stats.avgRating ? "/ 5" : ""} />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Books finished per month</CardTitle>
          <CardDescription>{year}</CardDescription>
        </CardHeader>
        <CardContent>
          <BooksChart perMonth={stats.perMonth} />
        </CardContent>
      </Card>

      <Tabs defaultValue={reading.length > 0 || books.length === 0 ? "reading" : "want"} className="mt-6">
        <TabsList>
          <TabsTrigger value="reading">Reading ({reading.length})</TabsTrigger>
          <TabsTrigger value="want">Up next ({upNext.length})</TabsTrigger>
          <TabsTrigger value="finished">Finished ({finished.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="reading" className="mt-2">
          {reading.length === 0 ? (
            <Empty text={upNext.length > 0 ? "Start something from Up next." : "Add the book you're reading now."} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {reading.map((b) => (
                <ReadingCard key={b.id} book={b} today={today} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="want" className="mt-2">
          {upNext.length === 0 ? (
            <Empty text="Nothing queued. Add books you want to read." />
          ) : (
            <Card>
              <CardContent>
                <ul className="divide-y">
                  {upNext.map((b) => (
                    <UpNextRow key={b.id} book={b} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="finished" className="mt-2 flex flex-col gap-4">
          {finished.length === 0 ? (
            <Empty text="Finished books land here with your rating." />
          ) : (
            [...byYear].map(([y, list]) => (
              <Card key={y}>
                <CardHeader>
                  <CardTitle>{y}</CardTitle>
                  <CardDescription>
                    {list.length} {list.length === 1 ? "book" : "books"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {list.map((b) => (
                      <FinishedRow key={b.id} book={b} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

function Stat({ label, value, unit }: { label: string; value: React.ReactNode; unit?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular">
          {value} {unit && <span className="text-base font-normal text-muted-foreground">{unit}</span>}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
        <BookOpenIcon className="size-8" />
        {text}
      </CardContent>
    </Card>
  );
}
