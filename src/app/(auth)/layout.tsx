import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/");

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <Logo className="text-lg" />
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
