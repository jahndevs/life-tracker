"use client";

import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  size = "sm",
}: {
  value: number | null;
  onChange?: (rating: number) => void;
  size?: "sm" | "lg";
}) {
  const icon = size === "lg" ? "size-7" : "size-3.5";

  if (!onChange) {
    if (value == null) return null;
    return (
      <span className="inline-flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <StarIcon
            key={n}
            className={cn(icon, n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")}
          />
        ))}
      </span>
    );
  }

  return (
    <div role="radiogroup" aria-label="Rating" className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
          onClick={() => onChange(n)}
          className="rounded-md p-0.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <StarIcon
            className={cn(
              icon,
              "transition-colors",
              value != null && n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/50 hover:text-amber-400",
            )}
          />
        </button>
      ))}
    </div>
  );
}
