import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireUser } from "@/lib/auth/session";
import { requirePlan } from "@/lib/plan";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await requirePlan(user.id);

  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <AppSidebar user={{ email: user.email, name: user.name }} />
      <SidebarInset>
        <div className="mx-auto w-full max-w-6xl p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
