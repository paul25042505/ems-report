"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { savePatient } from "../actions";
import { ActionForm, ChoiceGroup, Field, FormMessage, SubmitButton } from "@/components/forms";
import { AGE_GROUPS, CATEGORIES, DISPOSITIONS, PATIENT_TYPES, SEXES, ageGroupLabel, ageGroupOf } from "@/lib/constants";

export type PatientDefaults = {
  arrivedAt: string;
  patientType?: string;
  name?: string;
  sex?: string;
  age?: number | null;
  ageGroup?: string;
  category?: string;
  complaint?: string;
  treatment?: string;
  disposition?: string;
  hospital?: string;
  ambulance?: string;
  departedAt?: string;
  note?: string;
};

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
  const [patientType, setPatientType] = useState(defaults.patientType ?? "");
  const [age, setAge] = useState(defaults.age == null ? "" : String(defaults.age));
  const ageNumber = age.trim() === "" ? null : Number(age);
  const autoAgeGroup = ageNumber !== null && Number.isInteger(ageNumber) && ageNumber >= 0 && ageNumber <= 120 ? ageGroupOf(ageNumber) : null;

  return (
    <ActionForm action={action} className="space-y-5">
      <div
        className="space-y-5"
        onChange={(e) => {
          const t = e.target as HTMLInputElement;
          if (t.name === "disposition") setDisposition(t.value);
          if (t.name === "patientType") setPatientType(t.value);
        }}
      >
        <FormMessage state={state} />

        <Field label="到站時間" name="arrivedAt" state={state}>
          <input id="arrivedAt" name="arrivedAt" type="datetime-local" className="input" defaultValue={defaults.arrivedAt} required />
        </Field>

        <Field label="身分" name="patientType" state={state}>
          <ChoiceGroup name="patientType" options={PATIENT_TYPES} defaultValue={defaults.patientType} />
        </Field>

        {patientType && (
          <Field label="姓名" name="name" state={state} hint="不知道可留空">
            <input id="name" name="name" className="input" maxLength={30} defaultValue={defaults.name} autoComplete="off" />
          </Field>
        )}

        <Field label="性別" name="sex" state={state}>
          <ChoiceGroup name="sex" options={SEXES} defaultValue={defaults.sex} />
        </Field>

        <Field label="年齡" name="age" state={state} hint="知道實際年齡請直接輸入；不知道就用下方快速選擇年齡層">
          <input
            id="age"
            name="age"
            type="number"
            inputMode="numeric"
            min={0}
            max={120}
            className="input w-32"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="歲"
          />
        </Field>

        <Field label="年齡層（快速選擇）" name="ageGroup" state={state}>
          {autoAgeGroup ? (
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">已依年齡自動判斷：{ageGroupLabel(autoAgeGroup)}</p>
          ) : (
            <ChoiceGroup name="ageGroup" options={AGE_GROUPS} defaultValue={defaults.age == null ? defaults.ageGroup : undefined} columns={2} />
          )}
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
