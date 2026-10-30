"use client";

import { useActionState } from "react";
import {
  addAllowedUser,
  approveAccountRequest,
  createEvent,
  createStation,
  resetEventData,
  setMemberRoles,
  updateEvent,
  updateStation,
} from "./actions";
import { ActionForm, Field, FormMessage, SubmitButton } from "@/components/forms";
import { MEMBER_ROLES, STATION_STATUS } from "@/lib/constants";

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
  wheelchairs?: number;
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
        <Field label="輪椅數量" name="wheelchairs" id={`${p}wheelchairs`} state={state} hint="沒有輪椅填 0，站點就不會出現輪椅借用">
          <input
            id={`${p}wheelchairs`}
            name="wheelchairs"
            type="number"
            inputMode="numeric"
            min={0}
            max={200}
            className="input"
            defaultValue={station?.wheelchairs ?? 0}
          />
        </Field>
      </div>
      <SubmitButton className="btn-dark" pending={pending}>
        {station ? "儲存站點" : "新增救護站"}
      </SubmitButton>
    </ActionForm>
  );
}

export function AllowedUserForm() {
  const [state, action, pending] = useActionState(addAllowedUser, {});
  return (
    <ActionForm action={action} resetOn={state} className="space-y-3">
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-[2fr_auto_1fr_auto] sm:items-end">
        <Field label="Google 帳號（Email）" name="email" id="allowed-email" state={state}>
          <input id="allowed-email" name="email" type="email" className="input" placeholder="someone@gmail.com" required autoComplete="off" />
        </Field>
        <Field label="角色（可複選）" name="roles" id="allowed-role-station" state={state}>
          <RoleCheckboxes idPrefix="allowed" defaults={["STATION"]} />
        </Field>
        <Field label="備註" name="note" id="allowed-note" state={state}>
          <input id="allowed-note" name="note" className="input" placeholder="例：主站 王醫務士" maxLength={50} />
        </Field>
        <SubmitButton className="btn-dark" pending={pending}>
          加入名單
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

function RoleCheckboxes({ idPrefix, defaults }: { idPrefix: string; defaults: string[] }) {
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-1">
      {MEMBER_ROLES.map((r) => (
        <label key={r.value} className="flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap">
          <input
            type="checkbox"
            id={`${idPrefix}-role-${r.value.toLowerCase()}`}
            name={r.value === "COMMAND" ? "roleCommand" : "roleStation"}
            defaultChecked={defaults.includes(r.value)}
            className="h-5 w-5"
          />
          {r.label}
        </label>
      ))}
    </div>
  );
}

/** 名單上每位成員的角色勾選與儲存 */
export function MemberRolesForm({ email, roles }: { email: string; roles: string[] }) {
  const [state, action, pending] = useActionState(setMemberRoles.bind(null, email), {});
  return (
    <ActionForm action={action} className="flex flex-wrap items-center gap-2">
      <RoleCheckboxes idPrefix={email} defaults={roles} />
      <SubmitButton className="btn-secondary btn-sm" pending={pending}>
        儲存
      </SubmitButton>
      {(state.error || state.message) && (
        <span className={`text-xs font-semibold ${state.error ? "text-red-700" : "text-green-700"}`}>{state.error ?? state.message}</span>
      )}
    </ActionForm>
  );
}

/** 帳號申請：勾選角色後核准 */
export function ApproveRequestForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(approveAccountRequest.bind(null, email), {});
  return (
    <ActionForm action={action} className="flex flex-wrap items-center gap-2">
      <RoleCheckboxes idPrefix={`req-${email}`} defaults={["STATION"]} />
      <SubmitButton className="btn-dark btn-sm" pending={pending}>
        核准
      </SubmitButton>
      {state.error && <span className="text-xs font-semibold text-red-700">{state.error}</span>}
    </ActionForm>
  );
}

/** 清除場次測試資料：需輸入「清除」並再按一次確認 */
export function ResetEventForm({ eventId, eventName }: { eventId: string; eventName: string }) {
  const [state, action, pending] = useActionState(resetEventData.bind(null, eventId), {});
  return (
    <ActionForm action={action} resetOn={state} className="space-y-3">
      <FormMessage state={state} />
      <Field label="請輸入「清除」以確認" name="confirm" id="reset-confirm" state={state}>
        <input id="reset-confirm" name="confirm" className="input" autoComplete="off" placeholder="清除" />
      </Field>
      <button
        type="submit"
        disabled={pending}
        className="btn w-full bg-red-700 text-white hover:bg-red-800"
        onClick={(e) => {
          if (!window.confirm(`確定要清除「${eventName}」的所有傷患紀錄、支援申請，並把物資與站點狀態恢復預設嗎？此動作無法復原。`)) {
            e.preventDefault();
          }
        }}
      >
        {pending ? "清除中…" : "清除測試資料"}
      </button>
    </ActionForm>
  );
}
