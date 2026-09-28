"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toErrors } from "@/components/auth/errors";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Log in to today&apos;s cockpit.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action}>
          {next && <input type="hidden" name="next" value={next} />}
          <FieldGroup>
            <Field data-invalid={!!state?.errors?.email}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={state?.values?.email}
                aria-invalid={!!state?.errors?.email}
                required
              />
              <FieldError errors={toErrors(state?.errors?.email)} />
            </Field>
            <Field data-invalid={!!state?.errors?.password}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!state?.errors?.password}
                required
              />
              <FieldError errors={toErrors(state?.errors?.password)} />
            </Field>
            {state?.message && <FieldError>{state.message}</FieldError>}
            <Field>
              <Button type="submit" disabled={pending}>
                {pending ? "Logging in…" : "Log in"}
              </Button>
              <FieldDescription className="text-center">
                No account? <Link href="/signup">Sign up</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
