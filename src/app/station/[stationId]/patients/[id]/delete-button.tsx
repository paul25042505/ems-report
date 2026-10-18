"use client";

import { useTransition } from "react";
import { deletePatient } from "../../actions";

export function DeletePatientButton({ stationId, patientId }: { stationId: string; patientId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="btn w-full bg-red-50 text-red-800 ring-1 ring-red-200 hover:bg-red-100"
      onClick={() => {
        if (!window.confirm("確定要刪除這筆傷患紀錄嗎？刪除後無法復原。")) return;
        startTransition(() => deletePatient(stationId, patientId));
      }}
    >
      {pending ? "刪除中…" : "刪除此筆紀錄"}
    </button>
  );
}
