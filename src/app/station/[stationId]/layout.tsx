import { AppHeader } from "@/components/app-header";
import { getStationContext } from "@/lib/context";

export default async function StationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ stationId: string }>;
}) {
  const { stationId } = await params;
  const { station } = await getStationContext(stationId);
  const base = `/station/${station.id}`;
  return (
    <>
      <AppHeader
        subtitle={`${station.event.name}｜${station.name}`}
        nav={[
          { href: base, label: "站點首頁" },
          { href: `${base}/supplies`, label: "物資" },
          { href: `${base}/requests`, label: "支援申請" },
          { href: "/station", label: "切換站點" },
        ]}
      />
      <main className="mx-auto max-w-2xl space-y-4 p-4">{children}</main>
    </>
  );
}
