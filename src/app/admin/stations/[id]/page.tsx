import Link from "next/link";
import { notFound } from "next/navigation";
import { countPatients, getEvent, getStation } from "@/lib/repo";
import { deleteStation } from "../../actions";
import { StationForm } from "../../admin-forms";

export const dynamic = "force-dynamic";

export default async function StationAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getStation(id);
  const event = found && (await getEvent(found.eventId));
  if (!found || !event) notFound();
  const station = { ...found, event, _count: { patients: await countPatients(found.id) } };

  return (
    <>
      <Link href={`/admin?event=${station.eventId}`} className="no-print text-sm text-red-700 hover:underline">
        ← 返回 {station.event.name}
      </Link>
      <div className="max-w-2xl space-y-4">
        <h1>{station.name}</h1>
        <div className="space-y-4">
          <section className="card">
            <h2 className="mb-2">站點資料</h2>
            <StationForm eventId={station.eventId} station={station} />
          </section>
          {station._count.patients === 0 && (
            <section className="card">
              <h2 className="mb-2 text-base">刪除救護站</h2>
              <p className="mb-2 text-sm text-slate-600">此站尚無傷患紀錄，可以刪除。已有紀錄的站請改為「已撤站」。</p>
              <form action={deleteStation.bind(null, station.id)}>
                <button className="btn btn-sm bg-red-100 text-red-800 hover:bg-red-200">刪除此站</button>
              </form>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
