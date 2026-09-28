type BookShape = {
  status: string;
  rating: number | null;
  pagesTotal: number | null;
  pagesRead: number;
  finishedAt: string | null;
};

export function progressPct(book: Pick<BookShape, "pagesRead" | "pagesTotal">): number | null {
  if (!book.pagesTotal) return null;
  return Math.min(100, Math.round((book.pagesRead / book.pagesTotal) * 100));
}

export function yearStats<T extends BookShape>(books: T[], year: number) {
  const finished = books.filter((b) => b.status === "finished" && b.finishedAt?.startsWith(`${year}-`));
  const rated = finished.filter((b) => b.rating != null);
  const perMonth = Array.from({ length: 12 }, () => 0);
  for (const b of finished) perMonth[Number(b.finishedAt!.slice(5, 7)) - 1]++;

  return {
    finished,
    count: finished.length,
    pages: finished.reduce((sum, b) => sum + (b.pagesTotal ?? b.pagesRead), 0),
    avgRating: rated.length
      ? Math.round((rated.reduce((sum, b) => sum + b.rating!, 0) / rated.length) * 10) / 10
      : null,
    perMonth,
  };
}
