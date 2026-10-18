"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { savePatient } from "../actions";
import { ActionForm, ChoiceGroup, Field, FormMessage, SubmitButton } from "@/components/forms";
import { AGE_GROUPS, CATEGORIES, DISPOSITIONS, PATIENT_TYPES, SEXES, TRIAGE_LEVELS } from "@/lib/constants";

export type PatientDefaults = {
  arrivedAt: string;
  patientType?: string;
  sex?: string;
  ageGroup?: string;
  triage?: number;
  category?: string;
  complaint?: string;
  treatment?: string;
  disposition?: string;
  hospital?: string;
  ambulance?: string;
  departedAt?: string;
  note?: string;
};

const triageColor = (v: number) => TRIAGE_LEVELS.find((t) => t.value === v)?.color ?? "";

export function PatientForm({
  stationId,
  patientId,
  defaults,
}: {
  stationId: string;
  patientId: string | null;
  defaults: PatientDefaults;
}) {
  const [state, action, pending] = useActionState(savePatient.bind(null, stationId, patientId), {});
  const [disposition, setDisposition] = useState(defaults.disposition ?? "OBSERVING");

  return (
    <ActionForm action={action} className="space-y-5">
      <div
        className="space-y-5"
        onChange={(e) => {
          const t = e.target as HTMLInputElement;
          if (t.name === "disposition") setDisposition(t.value);
        }}
      >
        <FormMessage state={state} />

        <Field label="到站時間" name="arrivedAt" state={state}>
          <input id="arrivedAt" name="arrivedAt" type="datetime-local" className="input" defaultValue={defaults.arrivedAt} required />
        </Field>

        <Field label="身分" name="patientType" state={state}>
          <ChoiceGroup name="patientType" options={PATIENT_TYPES} defaultValue={defaults.patientType ?? "PUBLIC"} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="性別" name="sex" state={state}>
            <ChoiceGroup name="sex" options={SEXES} defaultValue={defaults.sex} />
          </Field>
          <Field label="年齡層" name="ageGroup" state={state}>
            <ChoiceGroup name="ageGroup" options={AGE_GROUPS} defaultValue={defaults.ageGroup} columns={2} />
          </Field>
        </div>

        <Field label="檢傷分級（TTAS）" name="triage" state={state} hint="1級復甦急救、2級危急、3級緊急、4級次緊急、5級非緊急">
          <ChoiceGroup
            name="triage"
            options={TRIAGE_LEVELS.map((t) => ({ value: t.value, label: t.short }))}
            defaultValue={defaults.triage}
            columns={5}
            colorOf={triageColor}
          />
        </Field>

        <Field label="傷病類別" name="category" state={state}>
          <ChoiceGroup name="category" options={CATEGORIES} defaultValue={defaults.category} columns={2} />
        </Field>

        <Field label="主訴／症狀描述" name="complaint" state={state}>
          <textarea id="complaint" name="complaint" className="input" rows={2} maxLength={500} defaultValue={defaults.complaint} />
        </Field>

        <Field label="處置內容" name="treatment" state={state} hint="例如：冰敷、補充電解質、傷口清潔包紮">
          <textarea id="treatment" name="treatment" className="input" rows={2} maxLength={500} defaultValue={defaults.treatment} />
        </Field>

        <Field label="目前狀態／去向" name="disposition" state={state}>
          <ChoiceGroup name="disposition" options={DISPOSITIONS} defaultValue={defaults.disposition ?? "OBSERVING"} columns={2} />
        </Field>

        {disposition === "TRANSFERRED" && (
          <div className="grid gap-5 rounded-lg bg-red-50 p-3 ring-1 ring-red-200 sm:grid-cols-2">
            <Field label="後送醫院" name="hospital" state={state}>
              <input id="hospital" name="hospital" className="input" maxLength={100} defaultValue={defaults.hospital} />
            </Field>
            <Field label="救護車／車號" name="ambulance" state={state}>
              <input id="ambulance" name="ambulance" className="input" maxLength={50} defaultValue={defaults.ambulance} />
            </Field>
          </div>
        )}

        {disposition !== "OBSERVING" && (
          <Field label="離站時間" name="departedAt" state={state} hint="留空則以送出時間記錄">
            <input id="departedAt" name="departedAt" type="datetime-local" className="input" defaultValue={defaults.departedAt} />
          </Field>
        )}

        <Field label="備註" name="note" state={state}>
          <textarea id="note" name="note" className="input" rows={2} maxLength={500} defaultValue={defaults.note} />
        </Field>
      </div>

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-slate-200 bg-slate-100/95 px-4 py-3">
        <Link href={`/station/${stationId}`} className="btn-secondary flex-1">
          取消
        </Link>
        <SubmitButton className="btn-primary flex-[2]" pending={pending} pendingText="儲存中…">
          {patientId ? "儲存修改" : "送出登記"}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
