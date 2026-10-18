import { AppHeader } from "@/components/app-header";
import { requireRole } from "@/lib/auth";

export default async function CommandLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("COMMAND", "ADMIN");
  return (
    <>
      <AppHeader session={session} subtitle="指揮中心" />
      <main className="mx-auto max-w-6xl space-y-4 p-4">{children}</main>
    </>
  );
}
