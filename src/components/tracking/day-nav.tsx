import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DateNav({
  basePath,
  prev,
  next,
  todayLabel,
  isCurrent,
}: {
  basePath: string;
  prev: string;
  next: string | null;
  todayLabel: string;
  isCurrent: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" asChild>
        <Link href={`${basePath}?date=${prev}`} aria-label="Previous">
          <ChevronLeftIcon />
        </Link>
      </Button>
      {isCurrent ? (
        <Button variant="outline" disabled>
          {todayLabel}
        </Button>
      ) : (
        <Button variant="outline" asChild>
          <Link href={basePath}>{todayLabel}</Link>
        </Button>
      )}
      {next ? (
        <Button variant="outline" size="icon" asChild>
          <Link href={`${basePath}?date=${next}`} aria-label="Next">
            <ChevronRightIcon />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="icon" disabled aria-label="Next">
          <ChevronRightIcon />
        </Button>
      )}
    </div>
  );
}
