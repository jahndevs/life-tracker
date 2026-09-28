"use client";

import { AngryIcon, FrownIcon, LaughIcon, MehIcon, SmileIcon, type LucideIcon } from "lucide-react";
import { MOODS } from "@/lib/journal";
import { cn } from "@/lib/utils";

const MOOD_ICONS: Record<number, LucideIcon> = {
  1: AngryIcon,
  2: FrownIcon,
  3: MehIcon,
  4: SmileIcon,
  5: LaughIcon,
};

export function MoodPicker({
  value,
  onChange,
  disabled,
  size = "default",
}: {
  value: number | null;
  onChange: (mood: number | null) => void;
  disabled?: boolean;
  size?: "default" | "sm";
}) {
  return (
    <div role="radiogroup" aria-label="Mood" className="flex gap-1">
      {MOODS.map((m) => {
        const Icon = MOOD_ICONS[m.value];
        const selected = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={m.label}
            title={m.label}
            disabled={disabled}
            onClick={() => onChange(selected ? null : m.value)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border border-transparent text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
              size === "sm" ? "p-1.5" : "px-2.5 py-2",
              selected && "border-primary/50 bg-primary/10 text-foreground",
            )}
          >
            <Icon className={cn(size === "sm" ? "size-5" : "size-6", selected && "text-primary")} />
            {size === "default" && <span className="text-[11px]">{m.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function MoodIcon({ mood, className }: { mood: number | null; className?: string }) {
  if (mood == null) return null;
  const Icon = MOOD_ICONS[mood];
  const label = MOODS.find((m) => m.value === mood)?.label;
  return <Icon className={cn("size-4 text-muted-foreground", className)} aria-label={`Mood: ${label}`} />;
}
