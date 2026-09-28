"use server";

import { redirect } from "next/navigation";
import * as z from "zod";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export type AuthFormState =
  | {
      errors?: { name?: string[]; email?: string[]; password?: string[] };
      message?: string;
      values?: { name?: string; email?: string };
    }
  | undefined;

const email = z.email({ error: "Enter a valid email." }).trim().toLowerCase();

const SignupSchema = z.object({
  name: z.string().trim().max(80).optional(),
  email,
  password: z
    .string()
    .min(8, { error: "Use at least 8 characters." })
    // bcrypt ignores everything past 72 bytes.
    .refine((p) => new TextEncoder().encode(p).length <= 72, {
      error: "Use at most 72 characters.",
    }),
  timezone: z.string().optional(),
});

const LoginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Enter your password." }),
});

function validTimezone(tz: string | undefined) {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

export async function signup(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = SignupSchema.safeParse({
    name: formData.get("name") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
    timezone: formData.get("timezone") || undefined,
  });
  const values = { name: String(formData.get("name") ?? ""), email: String(formData.get("email") ?? "") };
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const { name, password, timezone } = parsed.data;
  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { errors: { email: ["An account with this email already exists."] }, values };
  }

  const user = await db.user.create({
    data: {
      email: parsed.data.email,
      name: name || null,
      passwordHash: await hashPassword(password),
      timezone: validTimezone(timezone),
    },
  });

  await createSession(user.id);
  redirect("/onboarding");
}

export async function login(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const values = { email: String(formData.get("email") ?? "") };
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash);
  if (!user || !ok) {
    return { message: "Incorrect email or password.", values };
  }

  await createSession(user.id);
  redirect(safeNext(formData.get("next")));
}

// Only same-origin paths, to avoid an open redirect.
function safeNext(next: FormDataEntryValue | null) {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  return next;
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
