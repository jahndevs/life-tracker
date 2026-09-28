"use client";

import { PlusIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addSupplement, setSupplementActive } from "@/app/actions/plan";
import { OptimisticCheckbox } from "@/components/tracking/optimistic-checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Supplement = { id: string; name: string; timing: string | null; active: boolean };

export function SupplementsEditor({ supplements }: { supplements: Supplement[] }) {
  const [name, setName] = useState("");
  const [timing, setTiming] = useState("");
  const [pending, startTransition] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await addSupplement({ name, timing });
      if (result.ok) {
        setName("");
        setTiming("");
      } else toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {supplements.map((s) => (
          <li key={s.id} className="flex items-center gap-3">
            <OptimisticCheckbox
              id={`stack-${s.id}`}
              checked={s.active}
              onCheckedChange={(active) => setSupplementActive(s.id, active)}
            />
            <label
              htmlFor={`stack-${s.id}`}
              className={cn("flex-1 text-sm font-medium", !s.active && "text-muted-foreground line-through")}
            >
              {s.name}
            </label>
            <span className="text-xs text-muted-foreground">{s.timing}</span>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="flex gap-2">
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Supplement name" required />
        <Input placeholder="Timing" value={timing} onChange={(e) => setTiming(e.target.value)} aria-label="Timing" className="w-36" />
        <Button type="submit" size="icon" disabled={pending} aria-label="Add supplement">
          <PlusIcon />
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        Unchecking retires a supplement from future days; history keeps it.
      </p>
    </div>
  );
}
