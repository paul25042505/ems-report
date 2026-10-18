import { toLocalInput } from "@/lib/time";
import { PatientForm } from "../patient-form";

export default async function NewPatientPage({ params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = await params;
  return (
    <div className="card">
      <h1 className="mb-4">登記傷患</h1>
      <PatientForm stationId={stationId} patientId={null} defaults={{ arrivedAt: toLocalInput(new Date()) }} />
    </div>
  );
}
