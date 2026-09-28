"use client";

import { Trash2Icon } from "lucide-react";
import { useTransition } from "react";
import { clearWeighIn } from "@/app/actions/tracking";
import { Button } from "@/components/ui/button";

export function ClearWeighInButton({ dayLogId }: { dayLogId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      disabled={pending}
      aria-label="Delete weigh-in"
      onClick={() => {
        if (confirm("Delete this weigh-in?")) startTransition(() => clearWeighIn(dayLogId));
      }}
    >
      <Trash2Icon />
    </Button>
  );
}
