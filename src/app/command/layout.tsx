import { AppHeader, COMMAND_NAV } from "@/components/app-header";

export default function CommandLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader subtitle="指揮中心" nav={COMMAND_NAV} />
      <main className="mx-auto max-w-6xl space-y-4 p-4">{children}</main>
    </>
  );
}
