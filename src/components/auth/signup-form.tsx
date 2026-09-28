"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toErrors } from "@/components/auth/errors";

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>One place for training, nutrition and habits.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <input
            type="hidden"
            name="timezone"
            ref={(el) => {
              if (el) el.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
            }}
          />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" name="name" autoComplete="given-name" defaultValue={state?.values?.name} />
            </Field>
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
                autoComplete="new-password"
                minLength={8}
                aria-invalid={!!state?.errors?.password}
                required
              />
              <FieldDescription>At least 8 characters.</FieldDescription>
              <FieldError errors={toErrors(state?.errors?.password)} />
            </Field>
            {state?.message && <FieldError>{state.message}</FieldError>}
            <Field>
              <Button type="submit" disabled={pending}>
                {pending ? "Creating account…" : "Sign up"}
              </Button>
              <FieldDescription className="text-center">
                Already have an account? <Link href="/login">Log in</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
