import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { completeOnboarding } from "@/app/actions/plan";
import { Logo } from "@/components/logo";
import { PlanForm } from "@/components/plan/plan-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { startOfWeek, todayIn } from "@/lib/dates";
import { getPlan } from "@/lib/plan";

export const metadata: Metadata = { title: "Set up your plan" };

export default async function OnboardingPage() {
  const user = await requireUser();
  if (await getPlan(user.id)) redirect("/");

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <Logo className="text-lg" />
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-xl">
            {user.name ? `Let's build your plan, ${user.name}` : "Let's build your plan"}
          </CardTitle>
          <CardDescription>
            These numbers set your training phases and weekly weight targets. Next you&apos;ll add
            macro targets, supplements and your training week.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlanForm
            action={completeOnboarding}
            submitLabel="Continue"
            defaults={{ startDate: startOfWeek(todayIn(user.timezone)) }}
          />
        </CardContent>
      </Card>
    </main>
  );
}
