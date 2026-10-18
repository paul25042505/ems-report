import { AppHeader } from "@/components/app-header";
import { requireReporter } from "@/lib/auth";

export default async function StationLayout({ children }: { children: React.ReactNode }) {
  const { session, station } = await requireReporter();
  return (
    <>
      <AppHeader session={session} subtitle={`${station.event.name}｜${station.name}`} />
      <main className="mx-auto max-w-2xl space-y-4 p-4">{children}</main>
    </>
  );
}
