import { notFound } from "next/navigation";
import { getPatient } from "@/lib/repo";
import { getStationContext } from "@/lib/context";
import { formatDateTime, toLocalInput } from "@/lib/time";
import { PatientForm } from "../patient-form";
import { DeletePatientButton } from "./delete-button";

export default async function EditPatientPage({ params }: { params: Promise<{ stationId: string; id: string }> }) {
  const { stationId, id } = await params;
  const { station } = await getStationContext(stationId);
  const p = await getPatient(id);
  if (!p || p.stationId !== station.id) notFound();

  return (
    <div className="card">
      <h1>更新傷患紀錄</h1>
      <p className="mb-4 text-xs text-slate-500">
        登記於 {formatDateTime(p.createdAt)}
      </p>
      <PatientForm
        stationId={station.id}
        patientId={p.id}
        defaults={{
          ...p,
          arrivedAt: toLocalInput(p.arrivedAt),
          departedAt: p.departedAt ? toLocalInput(p.departedAt) : "",
        }}
      />
      <div className="mt-6 border-t border-slate-200 pt-4">
        <DeletePatientButton stationId={station.id} patientId={p.id} />
      </div>
    </div>
  );
}
