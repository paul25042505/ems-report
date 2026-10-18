import { toLocalInput } from "@/lib/time";
import { PatientForm } from "../patient-form";

export default function NewPatientPage() {
  return (
    <div className="card">
      <h1 className="mb-4">登記傷患</h1>
      <PatientForm patientId={null} defaults={{ arrivedAt: toLocalInput(new Date()) }} />
    </div>
  );
}
