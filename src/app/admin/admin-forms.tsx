"use client";

import { useActionState } from "react";
import { createEvent, createStation, createUser, resetPassword, updateEvent, updateStation } from "./actions";
import { ActionForm, Field, FormMessage, SubmitButton } from "@/components/forms";
import { STATION_STATUS } from "@/lib/constants";

export function EventForm({ event }: { event?: { id: string; name: string; venue: string; startDate: string; endDate: string } }) {
  const [state, action, pending] = useActionState(event ? updateEvent.bind(null, event.id) : createEvent, {});
  const p = event ? "event-edit-" : "event-new-";
  return (
    <ActionForm action={action} className="space-y-3">
      <FormMessage state={state} />
      <Field label="活動名稱" name="name" id={`${p}name`} state={state}>
        <input id={`${p}name`} name="name" className="input" defaultValue={event?.name} placeholder="2026 國防知性之旅－○○營區" required />
      </Field>
      <Field label="地點" name="venue" id={`${p}venue`} state={state}>
        <input id={`${p}venue`} name="venue" className="input" defaultValue={event?.venue} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="開始日期" name="startDate" id={`${p}startDate`} state={state}>
          <input id={`${p}startDate`} name="startDate" type="date" className="input" defaultValue={event?.startDate} required />
        </Field>
        <Field label="結束日期" name="endDate" id={`${p}endDate`} state={state}>
          <input id={`${p}endDate`} name="endDate" type="date" className="input" defaultValue={event?.endDate} required />
        </Field>
      </div>
      <SubmitButton className="btn-dark" pending={pending}>
        {event ? "儲存場次" : "建立場次"}
      </SubmitButton>
    </ActionForm>
  );
}

type StationValues = {
  id: string;
  name: string;
  location: string;
  lat: number | null;
  lng: number | null;
  contactName: string;
  contactPhone: string;
  status: string;
};

export function StationForm({ eventId, station }: { eventId: string; station?: StationValues }) {
  const [state, action, pending] = useActionState(
    station ? updateStation.bind(null, station.id) : createStation.bind(null, eventId),
    {},
  );
  const p = station ? "station-edit-" : "station-new-";
  return (
    <ActionForm action={action} resetOn={station ? undefined : state} className="space-y-3">
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="站名" name="name" id={`${p}name`} state={state}>
          <input id={`${p}name`} name="name" className="input" defaultValue={station?.name} placeholder="主站、分站A…" required />
        </Field>
        <Field label="位置描述" name="location" id={`${p}location`} state={state}>
          <input id={`${p}location`} name="location" className="input" defaultValue={station?.location} placeholder="例：司令台左側帳篷" />
        </Field>
        <Field label="緯度" name="lat" id={`${p}lat`} state={state} hint="選填，用於地圖顯示（例 25.0330）">
          <input id={`${p}lat`} name="lat" inputMode="decimal" className="input" defaultValue={station?.lat ?? ""} />
        </Field>
        <Field label="經度" name="lng" id={`${p}lng`} state={state} hint="選填（例 121.5654）">
          <input id={`${p}lng`} name="lng" inputMode="decimal" className="input" defaultValue={station?.lng ?? ""} />
        </Field>
        <Field label="負責人" name="contactName" id={`${p}contactName`} state={state}>
          <input id={`${p}contactName`} name="contactName" className="input" defaultValue={station?.contactName} />
        </Field>
        <Field label="聯絡電話" name="contactPhone" id={`${p}contactPhone`} state={state}>
          <input id={`${p}contactPhone`} name="contactPhone" type="tel" className="input" defaultValue={station?.contactPhone} />
        </Field>
        <Field label="狀態" name="status" id={`${p}status`} state={state}>
          <select id={`${p}status`} name="status" className="input" defaultValue={station?.status ?? "OPEN"}>
            {STATION_STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <SubmitButton className="btn-dark" pending={pending}>
        {station ? "儲存站點" : "新增救護站"}
      </SubmitButton>
    </ActionForm>
  );
}

export function UserForm() {
  const [state, action, pending] = useActionState(createUser, {});
  const p = "user-new-";
  return (
    <ActionForm action={action} resetOn={state} className="space-y-3">
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="帳號" name="username" id={`${p}username`} state={state}>
          <input id={`${p}username`} name="username" className="input" autoComplete="off" required />
        </Field>
        <Field label="顯示名稱" name="displayName" id={`${p}displayName`} state={state}>
          <input id={`${p}displayName`} name="displayName" className="input" placeholder="例：指揮官 陳○○" required />
        </Field>
        <Field label="角色" name="role" id={`${p}role`} state={state}>
          <select id={`${p}role`} name="role" className="input" defaultValue="COMMAND">
            <option value="COMMAND">指揮中心</option>
            <option value="ADMIN">系統管理員</option>
          </select>
        </Field>
        <Field label="密碼" name="password" id={`${p}password`} state={state} hint="至少 8 碼">
          <input id={`${p}password`} name="password" type="password" className="input" autoComplete="new-password" required />
        </Field>
      </div>
      <SubmitButton className="btn-dark" pending={pending}>
        建立帳號
      </SubmitButton>
    </ActionForm>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(resetPassword, {});
  return (
    <ActionForm action={action} resetOn={state} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={userId} />
      <input name="password" type="password" className="input w-36 py-1 text-sm" placeholder="新密碼" autoComplete="new-password" aria-label="新密碼" />
      <SubmitButton className="btn-secondary btn-sm" pending={pending}>
        重設
      </SubmitButton>
      {(state.error || state.message) && (
        <span className={`text-xs font-semibold ${state.error ? "text-red-700" : "text-green-700"}`}>
          {state.fieldErrors?.password ?? state.error ?? state.message}
        </span>
      )}
    </ActionForm>
  );
}
