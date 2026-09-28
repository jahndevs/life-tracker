"use client";

import Link from "next/link";
import { setSupplementTaken } from "@/app/actions/tracking";
import { OptimisticCheckbox } from "@/components/tracking/optimistic-checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SupplementsCard({
  logs,
}: {
  logs: { id: string; taken: boolean; supplement: { name: string; timing: string | null } }[];
}) {
  const taken = logs.filter((l) => l.taken).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supplements</CardTitle>
        <CardDescription>Your daily stack.</CardDescription>
        <CardAction>
          <Badge variant={logs.length > 0 && taken === logs.length ? "default" : "secondary"} className="tabular">
            {taken}/{logs.length}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No supplements in your stack. <Link href="/plan#supplements" className="underline">Add some</Link>.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {logs.map((log) => (
              <li key={log.id} className="flex items-center gap-3">
                <OptimisticCheckbox
                  id={`supp-${log.id}`}
                  checked={log.taken}
                  onCheckedChange={(checked) => setSupplementTaken(log.id, checked)}
                />
                <label htmlFor={`supp-${log.id}`} className="flex-1 text-sm font-medium">
                  {log.supplement.name}
                </label>
                {log.supplement.timing && (
                  <span className="text-xs text-muted-foreground">{log.supplement.timing}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
