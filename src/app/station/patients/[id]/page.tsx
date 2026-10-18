import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireReporter } from "@/lib/auth";
import { formatDateTime, toLocalInput } from "@/lib/time";
import { PatientForm } from "../patient-form";

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { station } = await requireReporter();
  const p = await db.patient.findUnique({ where: { id } });
  if (!p || p.stationId !== station.id) notFound();

  return (
    <div className="card">
      <h1>更新傷患紀錄</h1>
      <p className="mb-4 text-xs text-slate-500">
        由 {p.reporterName} 登記於 {formatDateTime(p.createdAt)}
      </p>
      <PatientForm
        patientId={p.id}
        defaults={{
          ...p,
          arrivedAt: toLocalInput(p.arrivedAt),
          departedAt: p.departedAt ? toLocalInput(p.departedAt) : "",
        }}
      />
    </div>
  );
}
