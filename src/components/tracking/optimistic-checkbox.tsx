"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export function OptimisticCheckbox({
  checked,
  onCheckedChange,
  ...props
}: Omit<React.ComponentProps<typeof Checkbox>, "checked" | "onCheckedChange"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => Promise<unknown>;
}) {
  const [optimistic, setOptimistic] = useOptimistic(checked);
  const [, startTransition] = useTransition();

  return (
    <Checkbox
      {...props}
      checked={optimistic}
      onCheckedChange={(value) =>
        startTransition(async () => {
          setOptimistic(value === true);
          try {
            await onCheckedChange(value === true);
          } catch {
            toast.error("Couldn't save that. Try again.");
          }
        })
      }
    />
  );
}
