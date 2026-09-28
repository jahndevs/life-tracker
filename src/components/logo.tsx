import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center text-center leading-tight", className)}>
      <span className="font-semibold tracking-tight">Life Tracker</span>
      <span className="text-xs text-muted-foreground">By John</span>
    </div>
  );
}
